/**
 * Fusiona despachos duplicados por cambio de código.
 *
 * Cuando un juzgado cambia de código, carga-xlsx.ts no reconoce el despacho
 * existente y crea uno nuevo. El historial queda partido entre dos registros,
 * y generar-calificacion.ts los trata como despachos distintos: cree que el
 * funcionario se trasladó a mitad de año y calcula dos calificaciones
 * parciales en vez de una del 01/01 al 31/12.
 *
 * Este script deja un solo registro por juzgado, conservando el código
 * vigente y trasladando todo el historial hacia él.
 *
 * CRITERIO DE SUPERVIVENCIA
 *   Sobrevive el despacho cuyo registro de estadísticas más reciente
 *   (mayor `hasta`) sea posterior. Confirmado con el área: el código vigente
 *   es siempre el de las fechas más recientes.
 *
 * MODO DE USO
 *   node scripts/fusionar-despachos.mjs                → SIMULACIÓN, no escribe
 *   node scripts/fusionar-despachos.mjs --aplicar      → ejecuta los cambios
 *
 *   Contra una base que no sea local se exige además --si-estoy-seguro.
 *
 * DESPUÉS DE APLICAR hay que regenerar las calificaciones afectadas: este
 * script borra las calificaciones por despacho (datos derivados) para que se
 * recalculen desde cero con el historial ya unificado.
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

for (const linea of readFileSync('.env', 'utf8').split('\n')) {
	const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const url = process.env.DATABASE_URL ?? '';

// Entornos de prueba conocidos: MongoDB local y el clúster `csj-desarrollo`.
// Es una lista de permitidos, no de prohibidos: cualquier otra base —incluida
// producción— exige además --si-estoy-seguro.
const esLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);
const esDesarrolloAtlas = /@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) || /ac-wmgm4fk-shard-\d+-\d+\./.test(url);
const esEntornoDePrueba = esLocal || esDesarrolloAtlas;

const aplicar = process.argv.includes('--aplicar');
const seguro = process.argv.includes('--si-estoy-seguro');

const oculta = url.replace(/:[^:@/]+@/, ':****@');

console.log('');
console.log('  Base de datos:', oculta);
console.log('  Entorno:      ', esEntornoDePrueba ? 'PRUEBAS' : '*** NO ES DE PRUEBAS ***');
console.log('  Modo:         ', aplicar ? '*** APLICAR CAMBIOS ***' : 'simulación (no escribe nada)');
console.log('');

if (aplicar && !esEntornoDePrueba && !seguro) {
	console.error('╔═══════════════════════════════════════════════════════════════╗');
	console.error('║  ABORTADO                                                     ║');
	console.error('║  Se pidió --aplicar contra una base que NO es de pruebas.     ║');
	console.error('║  Para continuar hay que agregar también --si-estoy-seguro,    ║');
	console.error('║  y haber tomado un respaldo antes.                            ║');
	console.error('╚═══════════════════════════════════════════════════════════════╝');
	process.exit(1);
}

const db = new PrismaClient();

async function ultimaFecha(despachoId) {
	const r = await db.registroCalificacion.findFirst({
		where: { despachoId },
		orderBy: { hasta: 'desc' },
		select: { hasta: true },
	});
	return r?.hasta ?? new Date(0);
}

/**
 * Clave del índice único de RegistroCalificacion. Dos filas con la misma clave
 * no pueden convivir en el mismo despacho.
 */
const claveRegistro = (r) => [r.funcionarioId, r.clase, r.categoria, r.desde.toISOString().slice(0, 10), r.calificacionId ?? '-'].join('|');

/** Las cifras de una fila, para saber si dos filas en choque dicen lo mismo. */
const cifrasRegistro = (r) =>
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
 * Filas del despacho absorbido que ya existen igual en el vigente: la misma
 * estadística cargada bajo los dos códigos. Mover una sobre la otra viola el
 * índice único, y sumarlas contaría dos veces, así que se descarta la copia.
 *
 * Si las cifras difieren no se decide por cuenta propia: eso es elegir qué
 * número vale en un acto administrativo.
 */
async function duplicadosEntre(cliente, vigenteId, viejoId) {
	const delVigente = await cliente.registroCalificacion.findMany({ where: { despachoId: vigenteId } });
	const mapa = new Map(delVigente.map((r) => [claveRegistro(r), r]));
	const delViejo = await cliente.registroCalificacion.findMany({ where: { despachoId: viejoId } });

	const aDescartar = [];
	const enConflicto = [];
	for (const r of delViejo) {
		const gemelo = mapa.get(claveRegistro(r));
		if (!gemelo) continue;
		if (cifrasRegistro(r) === cifrasRegistro(gemelo)) aDescartar.push(r.id);
		else enConflicto.push({ registro: r, gemelo });
	}
	return { aDescartar, enConflicto };
}

/**
 * Revisa TODOS los juzgados antes de escribir el primero.
 *
 * Sin esto, una sorpresa en el tercer juzgado deja los dos primeros fusionados
 * y el resto partido: un estado a medias peor que el problema original. Pasó en
 * el ensayo del 2026-08-24 contra una copia de producción, y por eso existe
 * esta comprobación.
 */
async function revisarTodoAntesDeEscribir(duplicados) {
	const problemas = [];
	let descartables = 0;

	for (const [nombre, despachos] of duplicados) {
		const conFecha = [];
		for (const d of despachos) conFecha.push({ ...d, ultima: await ultimaFecha(d.id) });
		conFecha.sort((a, b) => b.ultima - a.ultima);
		const [vigente, ...absorbidos] = conFecha;

		for (const viejo of absorbidos) {
			const { aDescartar, enConflicto } = await duplicadosEntre(db, vigente.id, viejo.id);
			descartables += aDescartar.length;
			for (const c of enConflicto) {
				problemas.push(
					`${nombre}: la fila ${c.registro.clase}/${c.registro.categoria} del ` +
						`${c.registro.desde.toISOString().slice(0, 10)} existe en los dos despachos con cifras distintas.`
				);
			}
		}
	}

	console.log('─'.repeat(64));
	console.log('REVISIÓN PREVIA');
	console.log(`  Filas repetidas en los dos despachos, con cifras iguales: ${descartables}`);
	console.log(`  Filas repetidas con cifras DISTINTAS: ${problemas.length}`);
	console.log('');

	if (problemas.length) {
		console.error('╔═══════════════════════════════════════════════════════════════╗');
		console.error('║  ABORTADO ANTES DE ESCRIBIR NADA                              ║');
		console.error('║  Hay filas que existen en los dos despachos con cifras        ║');
		console.error('║  distintas. Cuál vale no lo decide un script.                 ║');
		console.error('╚═══════════════════════════════════════════════════════════════╝\n');
		for (const p of problemas.slice(0, 20)) console.error('  · ' + p);
		if (problemas.length > 20) console.error(`  ... y ${problemas.length - 20} más.`);
		console.error('');
		return false;
	}

	console.log('  Sin conflictos. Se puede continuar.\n');
	return true;
}

async function main() {
	// 1. Encontrar juzgados con más de un registro de despacho.
	const todos = await db.despacho.findMany({
		select: { id: true, nombre: true, codigo: true },
	});
	const porNombre = new Map();
	for (const d of todos) {
		if (!porNombre.has(d.nombre)) porNombre.set(d.nombre, []);
		porNombre.get(d.nombre).push(d);
	}
	const duplicados = [...porNombre.entries()].filter(([, ds]) => ds.length > 1);

	if (!duplicados.length) {
		console.log('No hay despachos duplicados. Nada que hacer.\n');
		return;
	}

	console.log(`Juzgados con más de un registro: ${duplicados.length}\n`);

	if (!(await revisarTodoAntesDeEscribir(duplicados))) {
		process.exitCode = 1;
		return;
	}

	const calificacionesAfectadas = new Set();
	const revisarAudiencias = [];
	let fusiones = 0;
	let descartadas = 0;

	for (const [nombre, despachos] of duplicados) {
		// 2. Decidir cuál sobrevive: el de la fecha más reciente.
		const conFecha = [];
		for (const d of despachos) conFecha.push({ ...d, ultima: await ultimaFecha(d.id) });
		conFecha.sort((a, b) => b.ultima - a.ultima);

		const vigente = conFecha[0];
		const absorbidos = conFecha.slice(1);

		console.log(`── ${nombre}`);
		console.log(`   CONSERVA  ${vigente.codigo}   último registro: ${vigente.ultima.toISOString().slice(0, 10)}`);

		for (const viejo of absorbidos) {
			const nRegistros = await db.registroCalificacion.count({ where: { despachoId: viejo.id } });
			const nAudiencias = await db.registroAudiencias.count({ where: { despachoId: viejo.id } });
			const nNovedades = await db.novedadFuncionario.count({ where: { despachoId: viejo.id } });

			console.log(
				`   ABSORBE   ${viejo.codigo}   último: ${viejo.ultima.toISOString().slice(0, 10)}` +
					`   → ${nRegistros} registros, ${nAudiencias} audiencias, ${nNovedades} novedades`
			);

			// Detectar choques de audiencias antes de tocar nada.
			const audViejas = await db.registroAudiencias.findMany({ where: { despachoId: viejo.id } });
			for (const a of audViejas) {
				const choque = await db.registroAudiencias.findFirst({
					where: { despachoId: vigente.id, funcionarioId: a.funcionarioId, periodo: a.periodo },
				});
				const f = await db.funcionario.findFirst({
					where: { id: a.funcionarioId },
					select: { nombre: true },
				});
				if (choque) {
					revisarAudiencias.push({
						juzgado: nombre,
						funcionario: f?.nombre ?? a.funcionarioId,
						periodo: a.periodo,
						seConserva: `${choque.programadas} programadas / ${choque.atendidas} atendidas`,
						seDescarta: `${a.programadas} programadas / ${a.atendidas} atendidas`,
					});
					console.log(`     · audiencias ${a.periodo} (${f?.nombre ?? ''}): HAY DOS REGISTROS → revisar`);
				}
			}

			// Calificaciones que habrá que regenerar.
			const cds = await db.calificacionDespacho.findMany({
				where: { despachoId: { in: [viejo.id, vigente.id] } },
				select: { calificacionId: true },
			});
			for (const c of cds) calificacionesAfectadas.add(c.calificacionId);

			if (!aplicar) {
				fusiones++;
				continue;
			}

			// --- Ejecución -------------------------------------------------
			// Todo dentro de una transacción: si algo falla, no queda nada a
			// medias. Un estado parcial (audiencias sumadas pero historial sin
			// trasladar) sería peor que el problema original.
			await db.$transaction(async (tx) => {
				// a) Calificaciones por despacho: datos derivados, se eliminan
				//    para recalcularlos con el historial ya unificado.
				//    VA PRIMERO: CalificacionDespacho exige un RegistroAudiencias,
				//    así que hay que soltarlo antes de tocar las audiencias.
				const cdsBorrar = await tx.calificacionDespacho.findMany({
					where: { despachoId: { in: [viejo.id, vigente.id] } },
					select: { id: true },
				});
				const idsCd = cdsBorrar.map((c) => c.id);
				if (idsCd.length) {
					await tx.calificacionSubfactor.deleteMany({ where: { calificacionId: { in: idsCd } } });
					// Los consolidados cuelgan de la calificación; se sueltan antes.
					await tx.registroCalificacion.deleteMany({
						where: { calificacionId: { in: idsCd }, categoria: 'Consolidado' },
					});
					await tx.calificacionDespacho.deleteMany({ where: { id: { in: idsCd } } });
				}

				// b) Audiencias. NO se suman: las digita una persona a mano
				//    consultando el total real del periodo, y el cálculo ocurre
				//    después de esa digitación. Sumar dos registros sería
				//    inventar una cifra que nadie verificó.
				//    Donde no hay choque, el registro simplemente se traslada.
				//    Donde sí lo hay, se conserva el del despacho vigente y se
				//    descarta el otro; queda reportado para volver a digitarlo.
				for (const a of audViejas) {
					const choque = await tx.registroAudiencias.findFirst({
						where: { despachoId: vigente.id, funcionarioId: a.funcionarioId, periodo: a.periodo },
					});
					if (choque) {
						await tx.registroAudiencias.delete({ where: { id: a.id } });
					} else {
						await tx.registroAudiencias.update({
							where: { id: a.id },
							data: { despachoId: vigente.id },
						});
					}
				}

				// c) Filas que ya existen igual en el vigente. Son la misma
				//    estadística cargada bajo los dos códigos: se descarta la
				//    copia. Moverla violaría el índice único, y sumarlas
				//    contaría doble. La revisión previa ya comprobó que ninguna
				//    de estas parejas tiene cifras distintas; si alguna la
				//    tuviera, aquí se aborta y la transacción deshace todo.
				const { aDescartar, enConflicto } = await duplicadosEntre(tx, vigente.id, viejo.id);
				if (enConflicto.length)
					throw new Error(`${nombre}: hay ${enConflicto.length} filas repetidas con cifras distintas. No se decide por script.`);
				if (aDescartar.length) {
					await tx.registroCalificacion.deleteMany({ where: { id: { in: aDescartar } } });
					descartadas += aDescartar.length;
				}

				// d) Registros de estadísticas y novedades: trasladar.
				await tx.registroCalificacion.updateMany({
					where: { despachoId: viejo.id },
					data: { despachoId: vigente.id },
				});
				await tx.novedadFuncionario.updateMany({
					where: { despachoId: viejo.id },
					data: { despachoId: vigente.id },
				});

				// e) Eliminar el despacho vacío.
				await tx.despacho.delete({ where: { id: viejo.id } });
			});
			fusiones++;
		}
		console.log('');
	}

	if (revisarAudiencias.length) {
		console.log('─'.repeat(64));
		console.log('AUDIENCIAS QUE HAY QUE VOLVER A DIGITAR');
		console.log('Los dos despachos tenían registro para el mismo funcionario y periodo.');
		console.log('Se conserva el del código vigente, pero la cifra correcta del año');
		console.log('completo hay que consultarla y digitarla de nuevo.\n');
		for (const r of revisarAudiencias) {
			console.log(`  ${r.juzgado}  ·  ${r.funcionario}  ·  ${r.periodo}`);
			console.log(`     se conserva:  ${r.seConserva}`);
			console.log(`     se descarta:  ${r.seDescarta}`);
		}
		console.log('');
	}

	console.log('─'.repeat(64));
	if (aplicar) {
		console.log(`Fusiones aplicadas: ${fusiones}`);
		console.log(`Filas repetidas descartadas: ${descartadas}`);
		console.log(`Calificaciones a regenerar: ${calificacionesAfectadas.size}`);
		console.log('\nSiguiente paso: volver a generar esas calificaciones desde la aplicación.');
	} else {
		console.log(`Fusiones que se harían: ${fusiones}`);
		console.log(`Calificaciones que habría que regenerar: ${calificacionesAfectadas.size}`);
		console.log('\nNo se modificó nada. Para ejecutar: --aplicar');
	}
	console.log('');
}

main()
	.catch((e) => {
		console.error('\nFalló:', e.message);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
