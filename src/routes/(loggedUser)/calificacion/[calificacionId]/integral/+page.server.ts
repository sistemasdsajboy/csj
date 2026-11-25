import { cortesDelNombre, datosEficiencia, separarEn } from '$lib/core/calificaciones/integral/datos';
import { calcularIntegral, esOpcionOrganizacion, OPCIONES_ORGANIZACION } from '$lib/core/calificaciones/integral/integral';
import {
	descuentosPorJuzgado,
	descuentosPredeterminados,
	factoresDe,
	redaccionDe,
	revisarCompletitud,
	seccionesMotivacion,
	seDigitaIntegral,
} from '$lib/core/calificaciones/integral/documento';
import {
	esPlantillaDespacho1,
	PLANTILLAS_DESPACHO_1,
	plantillaDe,
	plantillaSugerida,
} from '$lib/core/calificaciones/integral/eficiencia-despacho-1';
import { motivacionesPredeterminadasDespacho1 } from '$lib/core/calificaciones/integral/motivacion-despacho-1';
import {
	comoTexto,
	mismoTexto,
	motivacionesPredeterminadas,
	parrafosLibres,
	type FactorEditable,
} from '$lib/core/calificaciones/integral/motivacion';
import { prefijoDescuento } from '$lib/core/calificaciones/integral/motivacion-eficiencia';
import { exigirRol } from '$lib/server/acceso';
import { db } from '$lib/server/db-client';
import { cargarEntrada, firmasConfiguradas } from '$lib/server/formato-integral/entrada';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

/**
 * Formato de calificación integral: lo que el sistema no calcula se digita
 * aquí mientras la calificación está en revisión o aprobada. Digitan revisores
 * y administradores. El documento se descarga en revisión (borrador) y cuando
 * está aprobada.
 */

const ROLES_QUE_DIGITAN = ['reviewer', 'admin'] as const;

/** Lo último que se digitó en otra calificación del mismo despacho seccional, para no repetirlo. */
async function sugerencias(despachoSeccionalId: string | null, periodo: number, excluir: string) {
	if (!despachoSeccionalId) return {};
	const otras = await db.calificacionPeriodo.findMany({
		where: { despachoSeccionalId, id: { not: excluir }, integral: { isSet: true } },
		select: { periodo: true, integral: true },
		orderBy: { id: 'desc' },
		take: 30,
	});
	const de = <K extends 'iniciales' | 'oficioEscuela'>(k: K, mismoPeriodo = false) =>
		otras.find((o) => o.integral?.[k]?.trim() && (!mismoPeriodo || o.periodo === periodo))?.integral?.[k] ?? null;
	return { iniciales: de('iniciales'), oficioEscuela: de('oficioEscuela', true) };
}

export const load = (async ({ params, locals }) => {
	const { cp, funcionario, entrada } = await cargarEntrada(params.calificacionId);
	const factores = factoresDe(entrada);
	const despachosSeccionales = await db.despachoSeccional.findMany({
		select: { id: true, nombre: true, numero: true },
		orderBy: { numero: 'asc' },
	});

	return {
		calificacion: { id: cp.id, periodo: cp.periodo, estado: cp.estado, despachoSeccionalId: cp.despachoSeccionalId },
		funcionario,
		opcionesNombre: cortesDelNombre(funcionario.nombre),
		// Sin quién notifica: la página no lo usa de aquí (lo muestra `firmas`) y trae su cédula.
		integral: cp.integral ? { ...cp.integral, notifica: null } : null,
		redaccion: entrada.redaccion,
		// Despacho 1: la especialidad (redacción de eficiencia) de cada juzgado con días laborados.
		plantillasPorJuzgado:
			entrada.redaccion === 'despacho1'
				? entrada.eficiencia.despachos
						.filter((d) => d.despachoId && d.diasLaborados > 0)
						.map((d) => ({
							despachoId: d.despachoId!,
							juzgado: d.nombre,
							sugerida: plantillaSugerida(d),
							elegida: plantillaDe(d, cp.integral?.plantillasEficiencia),
						}))
				: [],
		opcionesPlantilla: Object.entries(PLANTILLAS_DESPACHO_1).map(([valor, etiqueta]) => ({ valor, etiqueta })),
		despachoSeccional: cp.despachoSeccional ? { nombre: cp.despachoSeccional.nombre, numero: cp.despachoSeccional.numero } : null,
		despachosSeccionales,
		opcionesOrganizacion: Object.entries(OPCIONES_ORGANIZACION).map(([valor, o]) => ({ valor, etiqueta: o.etiqueta })),
		// Por juzgado, una entrada por novedad con días descontados: la parte fija ("un (1) día de") y la descripción, que se puede modificar.
		descuentosPorJuzgado: descuentosPorJuzgado(entrada).map((g) => ({
			juzgado: g.juzgado,
			descuentos: g.descuentos.map((n) => ({ ...n, prefijo: prefijoDescuento(n.dias) })),
		})),
		sugerencias: await sugerencias(cp.despachoSeccionalId, cp.periodo, cp.id),
		// Mientras se digita, las firmas configuradas (las que se guardan; sin configurar, lo que ya
		// tenía); en otro estado, las que quedaron guardadas.
		firmas: {
			ponente: entrada.firmasConfiguradas?.ponente ?? cp.integral?.ponente ?? null,
			presidente: entrada.firmasConfiguradas?.presidente ?? cp.integral?.presidente ?? null,
			ponenteConfigurado: !!entrada.firmasConfiguradas?.ponente,
			presidenteConfigurado: !!entrada.firmasConfiguradas?.presidente,
			// Quién notifica por correo: el nombre y el cargo, como sale en el formato.
			notifica: (() => {
				const n = entrada.firmasConfiguradas?.notifica ?? (cp.integral?.notifica?.nombre?.trim() ? cp.integral.notifica : null);
				return n ? `${n.nombre}${n.cargo?.trim() ? ` – ${n.cargo.trim()}` : ''}` : null;
			})(),
			notificaConfigurado: !!entrada.firmasConfiguradas?.notifica,
		},
		esAdmin: !!locals.user?.roles.includes('admin'),
		factores,
		resultado: calcularIntegral(factores),
		avisos: revisarCompletitud(entrada),
		motivacion: seccionesMotivacion(entrada),
		seDigita: seDigitaIntegral(cp.estado),
		puedeEditar: seDigitaIntegral(cp.estado) && ROLES_QUE_DIGITAN.some((r) => locals.user?.roles.includes(r)),
		puedeDescargar: cp.estado === 'revision' || cp.estado === 'aprobada',
	};
}) satisfies PageServerLoad;

const texto = z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(4000).nullable());
const textoLargo = z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(30000).nullable());
// Llega solo si quien califica modificó el texto: es el predeterminado del que partió.
const base = z.string().max(30000).optional();
const numero = (min: number, max: number) =>
	z.preprocess((v) => (typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : null), z.number().min(min).max(max).nullable());
const entero = (min: number, max: number) =>
	z.preprocess((v) => (typeof v === 'string' && v.trim() ? Number(v) : null), z.number().int().min(min).max(max).nullable());
const fecha = z.preprocess(
	(v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null),
	z.date().nullable()
);

const formulario = z.object({
	// El nombre viene del sistema: solo se elige dónde se parte en nombres y apellidos.
	palabrasApellidos: entero(1, 20),
	genero: z.preprocess((v) => (v === 'femenino' || v === 'masculino' ? v : null), z.enum(['femenino', 'masculino']).nullable()),
	despachoSeccionalId: z.preprocess((v) => (typeof v === 'string' && /^[0-9a-f]{24}$/.test(v) ? v : null), z.string().nullable()),
	periodoDesde: fecha,
	periodoHasta: fecha,
	fechaSala: fecha,
	cargo: texto,
	municipio: texto,
	distrito: texto,
	provCargo1: texto,
	provMunicipio1: texto,
	provDistrito1: texto,
	provCargo2: texto,
	provMunicipio2: texto,
	provDistrito2: texto,
	calidadFormularios: entero(1, 1000),
	calidadSuma: numero(0, 42000),
	// Casilla del despacho 1: sin marcar, no llega.
	calidadArticulo29: z.preprocess((v) => v === 'on', z.boolean()),
	organizacionFechaVisita: fecha,
	organizacionOpcion: z.preprocess((v) => (esOpcionOrganizacion(v) ? v : null), z.string().nullable()),
	organizacionPuntaje: numero(0, 12),
	oficioEscuela: texto,
	publicacionesPuntaje: z.preprocess((v) => (v === '0' ? 0 : v === '1' ? 1 : null), z.union([z.literal(0), z.literal(1)]).nullable()),
	calidadMotivacion: textoLargo,
	calidadMotivacionBase: base,
	organizacionMotivacion: textoLargo,
	organizacionMotivacionBase: base,
	publicacionesMotivacion: textoLargo,
	publicacionesMotivacionBase: base,
	motivacionLibre: textoLargo,
	// Ponente y presidente no vienen del formulario: salen de Configuración → Firmas.
	iniciales: texto,
});

export const actions = {
	guardar: async ({ request, params, locals }) => {
		exigirRol(locals, ...ROLES_QUE_DIGITAN);
		const cp = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
			select: {
				id: true,
				estado: true,
				periodo: true,
				despachoSeccionalId: true,
				despachoSeccional: { select: { numero: true } },
				integral: true,
				funcionario: { select: { id: true, nombre: true } },
			},
		});
		if (!cp) return fail(404, { error: 'Calificación no encontrada.' });
		if (!seDigitaIntegral(cp.estado))
			return fail(400, {
				error: 'Los datos de la calificación integral solo se pueden digitar mientras la calificación está en revisión o aprobada.',
			});

		const crudo = Object.fromEntries(await request.formData());
		const r = formulario.safeParse(crudo);
		if (!r.success) {
			const campos = r.error.issues.map((i) => i.path.join('.')).join(', ');
			return fail(400, { error: `Hay datos fuera de rango o con formato inválido: ${campos}.` });
		}
		const d = r.data;
		if (d.calidadFormularios != null && d.calidadSuma != null && d.calidadSuma / d.calidadFormularios > 42)
			return fail(400, { error: 'El factor calidad (suma / formularios) no puede pasar de 42.' });
		// El despacho que califica solo se elige aquí si la calificación no lo tiene; si ya lo tiene, se cambia desde la calificación.
		const despachoSeccionalId = cp.despachoSeccionalId ? null : d.despachoSeccionalId;
		const elegido = despachoSeccionalId
			? await db.despachoSeccional.findFirst({ where: { id: despachoSeccionalId }, select: { numero: true } })
			: null;
		if (despachoSeccionalId && !elegido) return fail(400, { error: 'El despacho que califica no existe.' });
		// Cada despacho seccional tiene su redacción; los textos se comparan con los de ese despacho.
		const redaccion = redaccionDe(cp.despachoSeccional?.numero ?? elegido?.numero);

		// Periodo calificado: la fecha del año completo se guarda vacía, que es el predeterminado.
		const inicioAnio = Date.UTC(cp.periodo, 0, 1);
		const finAnio = Date.UTC(cp.periodo, 11, 31);
		const periodoDesde = d.periodoDesde && d.periodoDesde.getTime() !== inicioAnio ? d.periodoDesde : null;
		const periodoHasta = d.periodoHasta && d.periodoHasta.getTime() !== finAnio ? d.periodoHasta : null;
		if ((periodoDesde?.getTime() ?? inicioAnio) > (periodoHasta?.getTime() ?? finAnio))
			return fail(400, { error: 'El periodo calificado empieza después de la fecha en que termina.' });

		// Ponente y presidente: los configurados hoy. Sin configurar, se conserva lo que ya tenía.
		const firmas = await firmasConfiguradas(cp.despachoSeccionalId ?? despachoSeccionalId);

		const partes = d.palabrasApellidos != null ? separarEn(cp.funcionario.nombre, d.palabrasApellidos) : null;
		if (d.palabrasApellidos != null && !partes)
			return fail(400, { error: 'La forma de partir el nombre no corresponde al nombre registrado.' });

		const provisionalidad = [
			{ cargo: d.provCargo1, municipio: d.provMunicipio1, distrito: d.provDistrito1 },
			{ cargo: d.provCargo2, municipio: d.provMunicipio2, distrito: d.provDistrito2 },
		].filter((c) => c.cargo);

		// Un texto se guarda como modificado solo si quien califica lo tocó y quedó distinto
		// del predeterminado con estos mismos datos; si no, sale el predeterminado.
		const pre =
			redaccion === 'despacho1' ? motivacionesPredeterminadasDespacho1(d) : motivacionesPredeterminadas({ ...d, periodo: cp.periodo });
		const editada = (f: FactorEditable, texto: string | null, base: string | undefined) =>
			base === undefined || !texto || mismoTexto(texto, comoTexto(pre[f])) ? null : { texto, base };
		// La descripción de cada novedad con días descontados, de todos los juzgados. Los
		// campos se llaman `descuento_<id de la novedad>`; los ids salen de la base, no del
		// formulario. Va dentro de una oración, así que se guarda en una sola línea.
		const eficiencia = await datosEficiencia(cp.id);
		const descuentosEditados: { novedadId: string; texto: string; base: string }[] = [];
		for (const n of descuentosPredeterminados({ eficiencia })) {
			const valor = crudo[`descuento_${n.novedadId}`];
			const base = crudo[`descuento_${n.novedadId}Base`];
			const texto = typeof valor === 'string' ? parrafosLibres(valor).join(' ') : '';
			if (typeof base !== 'string' || !texto || mismoTexto(texto, n.descripcion)) continue;
			if (texto.length > 1000 || base.length > 1000)
				return fail(400, { error: 'La redacción de un día descontado es demasiado larga (máximo 1000 caracteres).' });
			descuentosEditados.push({ novedadId: n.novedadId, texto, base });
		}
		// Despacho 1: la especialidad de cada juzgado (`plantilla_<id del juzgado>`; los ids salen de la
		// base). Se guarda solo si difiere de la que corresponde a sus datos, para que siga a los datos.
		const plantillasEficiencia =
			redaccion === 'despacho1'
				? eficiencia.despachos.flatMap((dd) => {
						const valor = dd.despachoId ? crudo[`plantilla_${dd.despachoId}`] : undefined;
						return dd.despachoId && esPlantillaDespacho1(valor) && valor !== plantillaSugerida(dd)
							? [{ despachoId: dd.despachoId, plantilla: valor }]
							: [];
					})
				: [];

		await db.$transaction([
			db.funcionario.update({ where: { id: cp.funcionario.id }, data: { genero: d.genero, ...(partes ?? {}) } }),
			db.calificacionPeriodo.update({
				where: { id: cp.id },
				data: {
					...(despachoSeccionalId ? { despachoSeccionalId } : {}),
					integral: {
						set: {
							fechaSala: d.fechaSala,
							cargoCarrera: { cargo: d.cargo, municipio: d.municipio, distrito: d.distrito },
							provisionalidad,
							calidadFormularios: d.calidadFormularios,
							calidadSuma: d.calidadSuma,
							calidadArticulo29: redaccion === 'despacho1' ? d.calidadArticulo29 : null,
							organizacionFechaVisita: d.organizacionFechaVisita,
							organizacionOpcion: d.organizacionOpcion,
							organizacionPuntaje: d.organizacionOpcion === 'otro' ? d.organizacionPuntaje : null,
							oficioEscuela: d.oficioEscuela,
							publicacionesPuntaje: d.publicacionesPuntaje,
							calidadMotivacion: editada('calidad', d.calidadMotivacion, d.calidadMotivacionBase),
							organizacionMotivacion: editada('organizacion', d.organizacionMotivacion, d.organizacionMotivacionBase),
							publicacionesMotivacion: editada('publicaciones', d.publicacionesMotivacion, d.publicacionesMotivacionBase),
							descuentosEditados,
							plantillasEficiencia,
							motivacionLibre: d.motivacionLibre,
							periodoDesde,
							periodoHasta,
							ponente: firmas.ponente ?? cp.integral?.ponente ?? null,
							presidente: firmas.presidente ?? cp.integral?.presidente ?? null,
							notifica: firmas.notifica ?? cp.integral?.notifica ?? null,
							iniciales: d.iniciales,
						},
					},
				},
			}),
		]);
		return { success: true, mensaje: 'Datos guardados.' };
	},
} satisfies Actions;
