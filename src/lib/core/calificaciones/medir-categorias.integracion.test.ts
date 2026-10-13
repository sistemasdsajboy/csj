import { db } from '$lib/server/db-client';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generarCalificacionFuncionario } from './generar-calificacion';

// MEDICIÓN sobre una copia LOCAL de producción (H-35).
//
// Regenera TODAS las calificaciones y guarda el resultado en un JSON. Se corre
// dos veces sobre la misma copia recién restaurada —una con el código de main,
// otra con la corrección— y se comparan los dos archivos.
//
// Escribe en la base: solo se permite contra un MongoDB en 127.0.0.1. Las
// aprobadas se pasan a borrador en la copia para poder recalcularlas, igual que
// en la medición de H-21; la copia se descarta después.
const url = process.env.DATABASE_URL ?? '';
const esLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);
const salida = process.env.SALIDA_MEDICION ?? '';
const activa = process.env.PRUEBA_INTEGRACION === '1' && esLocal && !!salida;

describe.skipIf(!activa)('medición del efecto de reconocer categorías sin mayúsculas', () => {
	it('regenera todas las calificaciones', { timeout: 3600000 }, async () => {
		const calificaciones = await db.calificacionPeriodo.findMany({
			include: { funcionario: { select: { nombre: true } } },
			orderBy: { id: 'asc' },
		});
		await db.calificacionPeriodo.updateMany({ where: { estado: 'aprobada' }, data: { estado: 'borrador' } });

		const resultados = [];
		for (const c of calificaciones) {
			let ponderada: number | null = null;
			let error: string | null = null;
			let despachos: Array<{ codigo: string; total: number; diasLaborados: number }> = [];
			try {
				await generarCalificacionFuncionario(c.funcionarioId, c.periodo);
				const nueva = await db.calificacionPeriodo.findFirst({
					where: { id: c.id },
					include: { calificaciones: { include: { despacho: { select: { codigo: true } } } } },
				});
				ponderada = nueva?.calificacionPonderada ?? null;
				despachos = (nueva?.calificaciones ?? [])
					.map((d) => ({ codigo: d.despacho.codigo, total: d.calificacionTotalFactorEficiencia, diasLaborados: d.diasLaborados }))
					.sort((a, b) => a.codigo.localeCompare(b.codigo));
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
			}
			resultados.push({
				id: c.id,
				funcionario: c.funcionario.nombre,
				periodo: c.periodo,
				estado: c.estado,
				guardada: c.calificacionPonderada,
				ponderada,
				error,
				despachos,
			});
		}

		writeFileSync(salida, JSON.stringify(resultados, null, 1));
		console.log(`calificaciones: ${resultados.length}, con error: ${resultados.filter((r) => r.error).length}`);
		expect(resultados.length).toBeGreaterThan(0);
	});
});
