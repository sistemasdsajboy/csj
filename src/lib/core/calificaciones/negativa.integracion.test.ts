import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { generarCalificacionFuncionario } from './generar-calificacion';

const url = process.env.DATABASE_URL ?? '';
const activa = process.env.PRUEBA_INTEGRACION === '1' && /csj-desarrollo|127\.0\.0\.1|ac-wmgm4fk-shard/.test(url);

describe.skipIf(!activa)('calificacion que salia negativa', () => {
	it('ahora explica que las novedades descuentan de mas', { timeout: 300000 }, async () => {
		const f = await db.funcionario.findFirst({ where: { documento: '74369518' } });
		expect(f, 'debe existir GUSTAVO ADOLFO VEGA MOJICA').toBeTruthy();

		let mensaje = '';
		try {
			await generarCalificacionFuncionario(f!.id, 2025);
			const c = await db.calificacionPeriodo.findFirst({ where: { funcionarioId: f!.id, periodo: 2025 } });
			mensaje = `(no falló) ponderada ${c?.calificacionPonderada}`;
		} catch (e) {
			mensaje = e instanceof Error ? e.message : String(e);
		}
		console.log('\n  ' + mensaje + '\n');

		expect(mensaje).not.toContain('no falló');
		expect(mensaje).toContain('vinculado');
	});
});
