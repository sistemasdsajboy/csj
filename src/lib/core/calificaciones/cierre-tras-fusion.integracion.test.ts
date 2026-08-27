import { db } from '$lib/server/db-client';
import { describe, expect, it } from 'vitest';
import { descartarAsientosDeCierre } from './asiento-de-cierre';
import { fusionarJuzgado, planesDeFusion } from './fusionar-despachos';
import { generarCalificacionFuncionario } from './generar-calificacion';

// PRUEBA DE INTEGRACIÓN sobre una copia de producción.
//
// Comprueba el orden de las operaciones: mientras un juzgado siga partido, la
// calificación no se puede generar, porque del registro viejo solo queda el
// traspaso de inventario. Al unificarlo, sí.
const url = process.env.DATABASE_URL ?? '';
const esDesarrollo =
	/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) ||
	/@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) ||
	/ac-wmgm4fk-shard-\d+-\d+\./.test(url);
const activa = process.env.PRUEBA_INTEGRACION === '1' && esDesarrollo;

describe.skipIf(!activa)('primero unificar, después regenerar', () => {
	it('unifica todos los juzgados partidos y mide las calificaciones', { timeout: 900000 }, async () => {
		const planes = await planesDeFusion();
		console.log(`Juzgados partidos antes: ${planes.length}`);

		for (const plan of planes) {
			if (plan.conflictos.length) {
				console.log(`  ${plan.nombre}: NO se unifica, ${plan.conflictos.length} conflictos`);
				continue;
			}
			const { filasDescartadas } = await fusionarJuzgado(plan.nombre);
			console.log(`  ${plan.nombre}: unificado (${filasDescartadas} filas repetidas descartadas)`);
		}

		expect(await planesDeFusion()).toHaveLength(0);

		// Ahora sí, las calificaciones de 2025 de los afectados.
		// Solo los que tienen un asiento de cierre de verdad. Filtrar por
		// "alguna fila con ingreso negativo" devuelve 217 funcionarios, casi
		// todos sin cambio: los ingresos negativos sueltos son corrientes.
		const todos = await db.registroCalificacion.findMany({
			where: { periodo: 2025, categoria: { not: 'Consolidado' } },
		});
		const porDespacho = new Map<string, typeof todos>();
		for (const r of todos) {
			if (!porDespacho.has(r.despachoId)) porDespacho.set(r.despachoId, []);
			porDespacho.get(r.despachoId)!.push(r);
		}
		const conCierre = new Set<string>();
		for (const filas of porDespacho.values())
			for (const d of descartarAsientosDeCierre(filas).descartados) if (d.funcionarioId) conCierre.add(d.funcionarioId);
		const ids = [...conCierre];
		console.log(`\nCalificaciones de 2025 afectadas por el traspaso: ${ids.length}`);

		for (const funcionarioId of ids) {
			const funcionario = await db.funcionario.findFirst({ where: { id: funcionarioId }, select: { nombre: true } });
			const antes = await db.calificacionPeriodo.findFirst({
				where: { funcionarioId, periodo: 2025 },
				select: { id: true, estado: true, calificacionPonderada: true },
			});
			const nombre = (funcionario?.nombre ?? funcionarioId).padEnd(34);
			if (!antes) {
				console.log(`  ${nombre} sin calificación de 2025 guardada`);
				continue;
			}

			const estadoOriginal = antes.estado;
			if (estadoOriginal === 'aprobada') await db.calificacionPeriodo.update({ where: { id: antes.id }, data: { estado: 'revision' } });

			let linea: string;
			try {
				const id = await generarCalificacionFuncionario(funcionarioId, 2025);
				const c = await db.calificacionPeriodo.findFirst({ where: { id }, select: { calificacionPonderada: true } });
				const despues = c?.calificacionPonderada ?? 0;
				const dif = despues - antes.calificacionPonderada;
				linea =
					`${antes.calificacionPonderada.toFixed(2).padStart(7)} -> ${despues.toFixed(2).padStart(7)}  ` +
					`(${dif >= 0 ? '+' : ''}${dif.toFixed(2)})`;
			} catch (e) {
				linea = `NO SE PUDO GENERAR: ${(e instanceof Error ? e.message : String(e)).slice(0, 100)}`;
			}

			if (estadoOriginal === 'aprobada') await db.calificacionPeriodo.update({ where: { id: antes.id }, data: { estado: estadoOriginal } });

			console.log(`  ${nombre} [${estadoOriginal.padEnd(9)}] ${linea}`);
		}
	});
});
