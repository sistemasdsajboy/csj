import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { generarCalificacionFuncionario } from './generar-calificacion';

// PRUEBA DE INTEGRACIÓN sobre la copia de producción ya fusionada.
// Mide cuánto cambian las calificaciones al recalcularlas con el historial
// unificado. Solo tiene sentido justo después de aplicar la fusión.
const url = process.env.DATABASE_URL ?? '';
const esDesarrollo =
	/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) ||
	/@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) ||
	/ac-wmgm4fk-shard-\d+-\d+\./.test(url);
const activa = process.env.PRUEBA_INTEGRACION === '1' && esDesarrollo;

describe.skipIf(!activa)('impacto de la fusión sobre las calificaciones ya emitidas', () => {
	it('mide cuánto cambia cada una', { timeout: 900000 }, async () => {
		const pendientes = (
			await db.calificacionPeriodo.findMany({
				include: { calificaciones: { select: { id: true } }, funcionario: true },
			})
		).filter((c) => c.calificaciones.length === 0);

		const orden = { aprobada: 0, revision: 1, archivada: 2, borrador: 3, devuelta: 4, eliminada: 5 } as Record<string, number>;
		pendientes.sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9));

		const filas: string[] = [];
		let fallos = 0;

		for (const c of pendientes) {
			const antes = c.calificacionPonderada;
			let despues: number | string;
			try {
				await generarCalificacionFuncionario(c.funcionarioId, c.periodo);
				const nueva = await db.calificacionPeriodo.findFirst({ where: { id: c.id } });
				despues = nueva?.calificacionPonderada ?? 0;
			} catch (e) {
				despues = 'ERROR: ' + (e instanceof Error ? e.message.slice(0, 70) : '');
				fallos++;
			}
			const dif = typeof despues === 'number' ? (despues - antes).toFixed(2) : '';
			filas.push(
				`  ${c.estado.padEnd(10)} ${String(c.periodo)}  ${c.funcionario.nombre.padEnd(38)} ` +
					`antes ${antes.toFixed(2).padStart(7)}   despues ${typeof despues === 'number' ? despues.toFixed(2).padStart(7) : despues}   ${dif ? 'dif ' + dif : ''}`
			);
		}

		console.log('\n' + filas.join('\n') + `\n\n  total: ${pendientes.length}   con error: ${fallos}\n`);
		expect(pendientes.length).toBeGreaterThan(0);
	});
});
