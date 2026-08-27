import { db } from '$lib/server/db-client';
import { describe, expect, it } from 'vitest';
import { descartarAsientosDeCierre } from './asiento-de-cierre';
import { generarCalificacionFuncionario } from './generar-calificacion';

// PRUEBA DE INTEGRACIÓN sobre una copia de producción.
//
// Mide cuánto cambia cada calificación al dejar de contar el traspaso de
// inventario por cambio de código. No decide nada: informa, para que el área
// pueda ver el impacto antes de regenerar en producción.
const url = process.env.DATABASE_URL ?? '';
const esDesarrollo =
	/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) ||
	/@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) ||
	/ac-wmgm4fk-shard-\d+-\d+\./.test(url);
const activa = process.env.PRUEBA_INTEGRACION === '1' && esDesarrollo;

describe.skipIf(!activa)('no contar el traspaso de inventario por cambio de código', () => {
	it('mide el impacto en las calificaciones afectadas', { timeout: 600000 }, async () => {
		const registros = await db.registroCalificacion.findMany({
			where: { periodo: 2025, categoria: { not: 'Consolidado' } },
		});

		// Qué despachos tienen un asiento de cierre, y de quién.
		const porDespacho = new Map<string, typeof registros>();
		for (const r of registros) {
			if (!porDespacho.has(r.despachoId)) porDespacho.set(r.despachoId, []);
			porDespacho.get(r.despachoId)!.push(r);
		}

		const afectados = new Map<string, Set<string>>();
		for (const [despachoId, filas] of porDespacho) {
			const { descartados } = descartarAsientosDeCierre(filas);
			for (const d of descartados) {
				if (!d.funcionarioId) continue;
				if (!afectados.has(d.funcionarioId)) afectados.set(d.funcionarioId, new Set());
				afectados.get(d.funcionarioId)!.add(despachoId);
			}
		}

		console.log(`Funcionarios con traspaso de inventario en 2025: ${afectados.size}`);
		expect(afectados.size).toBeGreaterThan(0);

		for (const [funcionarioId, despachos] of afectados) {
			const funcionario = await db.funcionario.findFirst({ where: { id: funcionarioId }, select: { nombre: true } });
			const antes = await db.calificacionPeriodo.findFirst({
				where: { funcionarioId, periodo: 2025 },
				select: { id: true, estado: true, calificacionPonderada: true },
			});

			if (!antes) {
				console.log(`  ${funcionario?.nombre}: sin calificación de 2025 guardada`);
				continue;
			}

			// Una calificación aprobada no se recalcula (el generador sale antes),
			// así que para medirla hay que bajarle el estado y devolverlo.
			const estadoOriginal = antes.estado;
			if (estadoOriginal === 'aprobada')
				await db.calificacionPeriodo.update({ where: { id: antes.id }, data: { estado: 'revision' } });

			let despues: number | null = null;
			let fallo: string | null = null;
			try {
				const id = await generarCalificacionFuncionario(funcionarioId, 2025);
				const c = await db.calificacionPeriodo.findFirst({ where: { id }, select: { calificacionPonderada: true } });
				despues = c?.calificacionPonderada ?? null;
			} catch (e) {
				fallo = e instanceof Error ? e.message : String(e);
			}

			if (estadoOriginal === 'aprobada')
				await db.calificacionPeriodo.update({ where: { id: antes.id }, data: { estado: estadoOriginal } });

			const nombre = (funcionario?.nombre ?? funcionarioId).padEnd(34);
			if (fallo) {
				console.log(`  ${nombre} [${estadoOriginal}] NO SE PUDO GENERAR: ${fallo.slice(0, 110)}`);
				continue;
			}
			const dif = (despues ?? 0) - antes.calificacionPonderada;
			console.log(
				`  ${nombre} [${estadoOriginal.padEnd(9)}] ${antes.calificacionPonderada.toFixed(2).padStart(7)} -> ` +
					`${(despues ?? 0).toFixed(2).padStart(7)}  (${dif >= 0 ? '+' : ''}${dif.toFixed(2)}) · ${despachos.size} despacho(s)`
			);
		}
	});
});
