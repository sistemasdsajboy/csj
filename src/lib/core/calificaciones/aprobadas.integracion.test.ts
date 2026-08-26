import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { generarCalificacionFuncionario } from './generar-calificacion';

// PRUEBA DE INTEGRACIÓN sobre la copia de producción ya fusionada.
//
// generarCalificacionFuncionario NO recalcula una calificación aprobada: sale
// de inmediato. Para medir de verdad cuánto cambiarían, aquí se les baja el
// estado temporalmente, se recalculan, y se restaura el estado original.
// SOLO tiene sentido sobre la copia — nunca contra producción.
const url = process.env.DATABASE_URL ?? '';
const activa = process.env.PRUEBA_INTEGRACION === '1' && /csj-desarrollo|127\.0\.0\.1|ac-wmgm4fk-shard/.test(url);

describe.skipIf(!activa)('cuanto cambiarian las calificaciones YA APROBADAS', () => {
	it('las recalcula bajando el estado y lo restaura', { timeout: 900000 }, async () => {
		// Solo las aprobadas que la fusion invalido: las que quedaron sin detalle.
		// Las demas no las toco la fusion, asi que no hay nada que medir en ellas.
		const aprobadas = (
			await db.calificacionPeriodo.findMany({
				where: { estado: 'aprobada' },
				include: { funcionario: true, calificaciones: { select: { id: true } } },
			})
		).filter((c) => c.calificaciones.length === 0);

		console.log(`\n  aprobadas en la copia: ${aprobadas.length}\n`);
		const filas: string[] = [];

		for (const c of aprobadas) {
			const antes = c.calificacionPonderada;
			let despues: number | string;
			try {
				await db.calificacionPeriodo.update({ where: { id: c.id }, data: { estado: 'borrador' } });
				await generarCalificacionFuncionario(c.funcionarioId, c.periodo);
				const nueva = await db.calificacionPeriodo.findFirst({ where: { id: c.id } });
				despues = nueva?.calificacionPonderada ?? 0;
			} catch (e) {
				despues = 'ERROR: ' + (e instanceof Error ? e.message.slice(0, 60) : '');
			} finally {
				// Restaurar SIEMPRE el estado y la cifra original.
				await db.calificacionPeriodo.update({
					where: { id: c.id },
					data: { estado: 'aprobada', calificacionPonderada: antes },
				});
			}
			const dif = typeof despues === 'number' ? despues - antes : null;
			filas.push(
				`  ${String(c.periodo)}  ${c.funcionario.nombre.padEnd(38)} antes ${antes.toFixed(2).padStart(7)}` +
					`   recalculada ${typeof despues === 'number' ? despues.toFixed(2).padStart(7) : despues}` +
					`   ${dif !== null ? (Math.abs(dif) < 0.005 ? 'IGUAL' : 'CAMBIA ' + dif.toFixed(2)) : ''}`
			);
		}

		console.log(filas.join('\n') + '\n');
		expect(aprobadas.length).toBeGreaterThan(0);
	});
});
