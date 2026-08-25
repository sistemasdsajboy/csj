import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { generarCalificacionFuncionario } from './generar-calificacion';

// PRUEBA DE INTEGRACIÓN sobre la copia de producción ya fusionada.
// Regenera la calificación de un funcionario de uno de los 9 juzgados que
// estaban partidos, y comprueba que sale completa y sobre un solo despacho.
const url = process.env.DATABASE_URL ?? '';
const esDesarrollo =
	/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) ||
	/@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) ||
	/ac-wmgm4fk-shard-\d+-\d+\./.test(url);
const activa = process.env.PRUEBA_INTEGRACION === '1' && esDesarrollo;

const JUZGADO = 'JUZGADO 001 CIVIL MUNICIPAL DE CHIQUINQUIRA';

describe.skipIf(!activa)('regenerar una calificación de un juzgado ya fusionado', () => {
	it('sale completa, sobre un solo despacho y con el periodo entero', { timeout: 180000 }, async () => {
		const despachos = await db.despacho.findMany({ where: { nombre: JUZGADO } });
		expect(despachos.length, 'el juzgado debe estar ya fusionado en uno solo').toBe(1);

		const registro = await db.registroCalificacion.findFirst({
			where: { despachoId: despachos[0].id, periodo: 2025, categoria: { not: 'Consolidado' } },
			select: { funcionarioId: true },
		});
		expect(registro, 'debe haber estadísticas de 2025 en ese despacho').toBeTruthy();

		const id = await generarCalificacionFuncionario(registro!.funcionarioId, 2025);

		const calificacion = await db.calificacionPeriodo.findFirst({
			where: { id },
			include: { calificaciones: { include: { despacho: true, subfactores: true } }, funcionario: true },
		});

		expect(calificacion).toBeTruthy();
		expect(Number.isFinite(calificacion!.calificacionPonderada)).toBe(true);

		const despachosDeLaCalificacion = calificacion!.calificaciones.map((c) => c.despacho.nombre);
		// El juzgado aparece una sola vez: ya no se cree que hubo traslado.
		expect(despachosDeLaCalificacion.filter((n) => n === JUZGADO).length).toBe(1);

		for (const cd of calificacion!.calificaciones) {
			expect(Number.isFinite(cd.calificacionTotalFactorEficiencia)).toBe(true);
			expect(cd.diasLaborables).toBeGreaterThan(0);
		}

		console.log(
			`\n  ${calificacion!.funcionario.nombre} · 2025` +
				`\n  ponderada: ${calificacion!.calificacionPonderada}` +
				`\n  despachos: ${despachosDeLaCalificacion.join(' | ')}` +
				calificacion!.calificaciones
					.map(
						(c) =>
							`\n    ${c.despacho.codigo}  dias ${c.diasLaborados}/${c.diasLaborables}  eficiencia ${c.calificacionTotalFactorEficiencia}`
					)
					.join('') +
				'\n'
		);
	});
});
