import { db } from '$lib/server/db-client';
import type { Prisma, RegistroCalificacion } from '@prisma/client';

/**
 * Unifica juzgados que quedaron partidos en dos registros de `Despacho` por un
 * cambio de código.
 *
 * La lógica vivía en `scripts/fusionar-despachos.mjs` y se probaba a mano. Aquí
 * queda disponible para la interfaz y cubierta por pruebas: las funciones puras
 * deciden, y solo las de abajo tocan la base.
 *
 * Ver H-8, H-17 y H-20 en la documentación interna.
 */

/** Clave del índice único de RegistroCalificacion. */
export const claveRegistro = (r: Pick<RegistroCalificacion, 'funcionarioId' | 'clase' | 'categoria' | 'desde' | 'calificacionId'>) =>
	[r.funcionarioId, r.clase, r.categoria, r.desde.toISOString().slice(0, 10), r.calificacionId ?? '-'].join('|');

/** La misma clave sin la clase, para detectar choques al reclasificar. */
export const claveSinClase = (r: Pick<RegistroCalificacion, 'funcionarioId' | 'categoria' | 'desde' | 'calificacionId'>) =>
	[r.funcionarioId, r.categoria, r.desde.toISOString().slice(0, 10), r.calificacionId ?? '-'].join('|');

/** Las cifras de una fila, para saber si dos filas en choque dicen lo mismo. */
export const cifrasRegistro = (r: RegistroCalificacion) =>
	[
		r.inventarioInicial,
		r.ingresoEfectivo,
		r.cargaEfectiva,
		r.egresoEfectivo,
		r.conciliaciones,
		r.inventarioFinal,
		r.restan,
		r.cargaBruta ?? 0,
	].join(',');

/**
 * Categorías que `generar-calificacion.ts` reclasifica de oral a tutelas antes
 * de calcular. Si cambian allá, hay que cambiarlas aquí.
 */
export const CATEGORIAS_TUTELAS = [
	'Incidentes de Desacato',
	'Movimiento de Tutelas',
	'Procesos con sentencia y trámite posterior incidentes de Desacato',
	'Consultas Incidentes de Desacato',
	'Movimiento de Impugnaciones',
];

/**
 * Los códigos que el despacho que sobrevive debe recordar tras absorber a otro:
 * el del absorbido, más los que él ya recordaba. El suyo propio no.
 *
 * Es una anotación. **No interviene en ningún cálculo ni en la búsqueda de
 * despachos**: sirve para no perder con qué código se reportó la estadística de
 * los años anteriores al cambio.
 */
export const codigosAnterioresTrasFusion = (
	vigente: { codigo: string; codigosAnteriores?: string[] },
	absorbidos: Array<{ codigo: string; codigosAnteriores?: string[] }>
): string[] =>
	[...new Set([...(vigente.codigosAnteriores ?? []), ...absorbidos.flatMap((a) => [a.codigo, ...(a.codigosAnteriores ?? [])])])]
		.filter((c) => c && c !== vigente.codigo)
		.sort();

export type DespachoConFecha = { id: string; codigo: string; nombre: string; ultimoRegistro: Date | null };

/**
 * Cuál de los registros sobrevive: el de la estadística más reciente. Criterio
 * confirmado con el área — el código vigente es el de las fechas más recientes.
 */
export const elegirVigente = <T extends { ultimoRegistro: Date | null }>(despachos: T[]): { vigente: T; absorbidos: T[] } => {
	const enMilis = (f: Date | null) => f?.getTime() ?? 0;
	const [vigente, ...absorbidos] = [...despachos].sort((a, b) => enMilis(b.ultimoRegistro) - enMilis(a.ultimoRegistro));
	return { vigente, absorbidos };
};

export type Repetidas = {
	aDescartar: string[];
	enConflicto: Array<{ registro: RegistroCalificacion; gemela: RegistroCalificacion }>;
};

/**
 * Filas del despacho absorbido que ya existen igual en el vigente: la misma
 * estadística cargada bajo los dos códigos. Se descarta la copia; moverla
 * violaría el índice único y sumarlas contaría doble.
 *
 * Si las cifras difieren no se decide: cuál de las dos vale es una decisión
 * sobre la estadística de una persona.
 */
export const clasificarRepetidas = (delVigente: RegistroCalificacion[], delViejo: RegistroCalificacion[]): Repetidas => {
	const mapa = new Map(delVigente.map((r) => [claveRegistro(r), r]));
	const aDescartar: string[] = [];
	const enConflicto: Repetidas['enConflicto'] = [];
	for (const registro of delViejo) {
		const gemela = mapa.get(claveRegistro(registro));
		if (!gemela) continue;
		if (cifrasRegistro(registro) === cifrasRegistro(gemela)) aDescartar.push(registro.id);
		else enConflicto.push({ registro, gemela });
	}
	return { aDescartar, enConflicto };
};

/**
 * Filas que chocarán cuando el cálculo reclasifique de oral a tutelas.
 *
 * Al juntar los dos despachos puede quedar una fila ya marcada como tutelas y
 * otra igual todavía como oral. Con clases distintas no violan el índice, así
 * que `clasificarRepetidas` no las ve; pero al reclasificar, chocan — y la
 * calificación de esa persona deja de poder generarse.
 */
export const clasificarReclasificacion = (filas: RegistroCalificacion[]): Repetidas => {
	const enTutelas = filas.filter((r) => CATEGORIAS_TUTELAS.includes(r.categoria));
	const yaTutelas = new Map(enTutelas.filter((r) => r.clase === 'tutelas').map((r) => [claveSinClase(r), r]));
	const aDescartar: string[] = [];
	const enConflicto: Repetidas['enConflicto'] = [];
	for (const registro of enTutelas) {
		if (registro.clase === 'tutelas') continue;
		const gemela = yaTutelas.get(claveSinClase(registro));
		if (!gemela) continue;
		if (cifrasRegistro(registro) === cifrasRegistro(gemela)) aDescartar.push(registro.id);
		else enConflicto.push({ registro, gemela });
	}
	return { aDescartar, enConflicto };
};

// --- A partir de aquí se consulta la base ----------------------------------

export type AudienciaARedigitar = { funcionario: string; periodo: number; seConserva: string; seDescarta: string };

export type PlanFusion = {
	nombre: string;
	vigente: DespachoConFecha;
	absorbidos: Array<DespachoConFecha & { registros: number; audiencias: number; novedades: number }>;
	filasRepetidas: number;
	conflictos: string[];
	calificacionesARegenerar: number;
	audienciasARedigitar: AudienciaARedigitar[];
};

const ultimoRegistroDe = async (despachoId: string) => {
	const r = await db.registroCalificacion.findFirst({
		where: { despachoId },
		orderBy: { hasta: 'desc' },
		select: { hasta: true },
	});
	return r?.hasta ?? null;
};

/** Juzgados con más de un registro de despacho, con el plan de lo que pasaría. */
export async function planesDeFusion(): Promise<PlanFusion[]> {
	const todos = await db.despacho.findMany({ select: { id: true, codigo: true, nombre: true } });
	const porNombre = new Map<string, typeof todos>();
	for (const d of todos) {
		if (!porNombre.has(d.nombre)) porNombre.set(d.nombre, []);
		porNombre.get(d.nombre)!.push(d);
	}

	const planes: PlanFusion[] = [];
	for (const [nombre, despachos] of porNombre) {
		if (despachos.length < 2) continue;

		const conFecha: DespachoConFecha[] = [];
		for (const d of despachos) conFecha.push({ ...d, ultimoRegistro: await ultimoRegistroDe(d.id) });
		const { vigente, absorbidos } = elegirVigente(conFecha);

		const delVigente = await db.registroCalificacion.findMany({ where: { despachoId: vigente.id } });
		const detalle: PlanFusion['absorbidos'] = [];
		const conflictos: string[] = [];
		const audienciasARedigitar: AudienciaARedigitar[] = [];
		let filasRepetidas = 0;
		const calificaciones = new Set<string>();

		for (const viejo of absorbidos) {
			const delViejo = await db.registroCalificacion.findMany({ where: { despachoId: viejo.id } });
			const repetidas = clasificarRepetidas(delVigente, delViejo);
			const reclas = clasificarReclasificacion([...delVigente, ...delViejo]);
			filasRepetidas += repetidas.aDescartar.length + reclas.aDescartar.length;

			for (const c of [...repetidas.enConflicto, ...reclas.enConflicto])
				conflictos.push(
					`La fila ${c.registro.clase} / ${c.registro.categoria} del ${c.registro.desde.toISOString().slice(0, 10)} ` +
						`existe en los dos despachos con cifras distintas.`
				);

			const audiencias = await db.registroAudiencias.findMany({ where: { despachoId: viejo.id } });
			for (const a of audiencias) {
				const choque = await db.registroAudiencias.findFirst({
					where: { despachoId: vigente.id, funcionarioId: a.funcionarioId, periodo: a.periodo },
				});
				if (!choque) continue;
				const f = await db.funcionario.findFirst({ where: { id: a.funcionarioId }, select: { nombre: true } });
				audienciasARedigitar.push({
					funcionario: f?.nombre ?? a.funcionarioId,
					periodo: a.periodo,
					seConserva: `${choque.programadas} programadas / ${choque.atendidas} atendidas`,
					seDescarta: `${a.programadas} programadas / ${a.atendidas} atendidas`,
				});
			}

			detalle.push({
				...viejo,
				registros: delViejo.length,
				audiencias: audiencias.length,
				novedades: await db.novedadFuncionario.count({ where: { despachoId: viejo.id } }),
			});
		}

		const cds = await db.calificacionDespacho.findMany({
			where: { despachoId: { in: [vigente.id, ...absorbidos.map((a) => a.id)] } },
			select: { calificacionId: true },
		});
		for (const c of cds) calificaciones.add(c.calificacionId);

		planes.push({
			nombre,
			vigente,
			absorbidos: detalle,
			filasRepetidas,
			conflictos,
			calificacionesARegenerar: calificaciones.size,
			audienciasARedigitar,
		});
	}

	return planes.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Aplica la fusión de un juzgado. Todo dentro de una transacción: si algo
 * falla, no queda nada a medias.
 *
 * Las audiencias NO se suman: se digitan a mano consultando el total real del
 * periodo. Donde hay choque se conserva la del código vigente y se reporta para
 * volver a digitarla.
 */
export async function fusionarJuzgado(nombre: string): Promise<{ absorbidos: number; filasDescartadas: number }> {
	const plan = (await planesDeFusion()).find((p) => p.nombre === nombre);
	if (!plan) throw new Error(`El juzgado ${nombre} ya no tiene más de un registro de despacho.`);
	if (plan.conflictos.length)
		throw new Error(
			`No se puede fusionar ${nombre}: hay ${plan.conflictos.length} filas repetidas con cifras distintas. ` +
				`Cuál de las dos vale no lo decide el sistema. ${plan.conflictos.slice(0, 2).join(' ')}`
		);

	let filasDescartadas = 0;

	for (const viejo of plan.absorbidos) {
		await db.$transaction(async (tx: Prisma.TransactionClient) => {
			// a) Calificaciones por despacho: datos derivados, se eliminan para
			//    recalcularlos con el historial ya unificado. Van primero porque
			//    CalificacionDespacho exige un RegistroAudiencias.
			const cds = await tx.calificacionDespacho.findMany({
				where: { despachoId: { in: [viejo.id, plan.vigente.id] } },
				select: { id: true },
			});
			const idsCd = cds.map((c) => c.id);
			if (idsCd.length) {
				await tx.calificacionSubfactor.deleteMany({ where: { calificacionId: { in: idsCd } } });
				await tx.registroCalificacion.deleteMany({ where: { calificacionId: { in: idsCd }, categoria: 'Consolidado' } });
				await tx.calificacionDespacho.deleteMany({ where: { id: { in: idsCd } } });
			}

			// b) Audiencias: donde no hay choque se trasladan; donde sí, se
			//    conserva la del vigente y se descarta la otra.
			const audViejas = await tx.registroAudiencias.findMany({ where: { despachoId: viejo.id } });
			for (const a of audViejas) {
				const choque = await tx.registroAudiencias.findFirst({
					where: { despachoId: plan.vigente.id, funcionarioId: a.funcionarioId, periodo: a.periodo },
				});
				if (choque) await tx.registroAudiencias.delete({ where: { id: a.id } });
				else await tx.registroAudiencias.update({ where: { id: a.id }, data: { despachoId: plan.vigente.id } });
			}

			// c) Filas repetidas: se descartan antes de trasladar.
			const delVigente = await tx.registroCalificacion.findMany({ where: { despachoId: plan.vigente.id } });
			const delViejo = await tx.registroCalificacion.findMany({ where: { despachoId: viejo.id } });
			const repetidas = clasificarRepetidas(delVigente, delViejo);
			if (repetidas.enConflicto.length) throw new Error(`${nombre}: filas repetidas con cifras distintas.`);
			if (repetidas.aDescartar.length) {
				await tx.registroCalificacion.deleteMany({ where: { id: { in: repetidas.aDescartar } } });
				filasDescartadas += repetidas.aDescartar.length;
			}

			// d) Trasladar estadísticas y novedades.
			await tx.registroCalificacion.updateMany({ where: { despachoId: viejo.id }, data: { despachoId: plan.vigente.id } });
			await tx.novedadFuncionario.updateMany({ where: { despachoId: viejo.id }, data: { despachoId: plan.vigente.id } });

			// e) Ya con las filas juntas: descartar las que chocarían al reclasificar.
			const juntas = await tx.registroCalificacion.findMany({ where: { despachoId: plan.vigente.id } });
			const reclas = clasificarReclasificacion(juntas);
			if (reclas.enConflicto.length) throw new Error(`${nombre}: filas que chocarían al reclasificar tienen cifras distintas.`);
			if (reclas.aDescartar.length) {
				await tx.registroCalificacion.deleteMany({ where: { id: { in: reclas.aDescartar } } });
				filasDescartadas += reclas.aDescartar.length;
			}

			// f) Anotar el código que desaparece en el despacho que queda, y
			//    eliminar el vacío. La anotación es solo informativa.
			const quedan = await tx.despacho.findMany({
				where: { id: { in: [plan.vigente.id, viejo.id] } },
				select: { id: true, codigo: true, codigosAnteriores: true },
			});
			const sobrevive = quedan.find((d) => d.id === plan.vigente.id)!;
			const desaparece = quedan.find((d) => d.id === viejo.id)!;
			await tx.despacho.update({
				where: { id: plan.vigente.id },
				data: { codigosAnteriores: codigosAnterioresTrasFusion(sobrevive, [desaparece]) },
			});
			await tx.despacho.delete({ where: { id: viejo.id } });
		});
	}

	return { absorbidos: plan.absorbidos.length, filasDescartadas };
}
