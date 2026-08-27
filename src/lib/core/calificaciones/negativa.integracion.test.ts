import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { generarCalificacionFuncionario } from './generar-calificacion';

const url = process.env.DATABASE_URL ?? '';
const activa = process.env.PRUEBA_INTEGRACION === '1' && /csj-desarrollo|127\.0\.0\.1|ac-wmgm4fk-shard/.test(url);

// Las tres calificaciones que en producción salían con cifra negativa.
// Se identifican por documento: buscar por nombre parcial coincide con otras
// personas y la prueba mediría a quien no es.
const CASOS: Array<[string, string, number]> = [
	['40022911', 'JAZMIN CONSUELO NIÑO GAMEZ', 2025],
	['74369518', 'GUSTAVO ADOLFO VEGA MOJICA', 2025],
	['52951212', 'ANDREA MARGARITA DUEÑAS VACA', 2024],
];

describe.skipIf(!activa)('calificaciones que salian negativas', () => {
	it('ninguna vuelve a producir una cifra negativa', { timeout: 600000 }, async () => {
		for (const [documento, nombre, periodo] of CASOS) {
			const f = await db.funcionario.findFirst({ where: { documento } });
			if (!f) {
				console.log(`\n  ${nombre}: no está en la copia`);
				continue;
			}
			let resultado: string;
			try {
				await generarCalificacionFuncionario(f.id, periodo);
				const c = await db.calificacionPeriodo.findFirst({ where: { funcionarioId: f.id, periodo } });
				const p = c?.calificacionPonderada ?? 0;
				resultado = p < 0 ? `*** SIGUE NEGATIVA: ${p.toFixed(2)}` : `se generó con ${p.toFixed(2)}`;
				expect(p).toBeGreaterThanOrEqual(0);
			} catch (e) {
				resultado = 'falla con mensaje: ' + (e instanceof Error ? e.message.slice(0, 150) : '');
			}
			console.log(`\n  ${nombre} · ${periodo}\n     ${resultado}`);
		}
		console.log('');

		// Y ninguna de la base entera queda en negativo.
		const negativas = await db.calificacionPeriodo.count({ where: { calificacionPonderada: { lt: 0 } } });
		console.log(`  calificaciones negativas que quedan en la copia: ${negativas}\n`);
	});
});
