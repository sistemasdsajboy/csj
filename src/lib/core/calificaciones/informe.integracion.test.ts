import { writeFileSync } from 'node:fs';
import xlsx from 'node-xlsx';
import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { generarCalificacionFuncionario } from './generar-calificacion';

const url = process.env.DATABASE_URL ?? '';
const activa = process.env.PRUEBA_INTEGRACION === '1' && /csj-desarrollo|127\.0\.0\.1|ac-wmgm4fk-shard/.test(url);

const SALIDA = 'C:/Users/hugit/revision-calificaciones-2026-08-26.xlsx';

describe.skipIf(!activa)('informe para revision de la oficina', () => {
	it('regenera las afectadas y arma el Excel', { timeout: 1800000 }, async () => {
		const pendientes = (
			await db.calificacionPeriodo.findMany({
				include: { calificaciones: { select: { id: true } }, funcionario: true },
			})
		).filter((c) => c.calificaciones.length === 0);

		const resumen: (string | number)[][] = [
			['Funcionario', 'Documento', 'Periodo', 'Estado', 'Calificación actual', 'Recalculada', 'Diferencia', 'Observación'],
		];
		const detalle: (string | number)[][] = [
			[
				'Funcionario',
				'Periodo',
				'Juzgado',
				'Código',
				'Días hábiles',
				'Días laborados',
				'Carga efectiva',
				'Egreso efectivo',
				'Subfactor',
				'Carga del subfactor',
				'Egreso del subfactor',
				'Puntaje',
			],
		];

		for (const c of pendientes) {
			const antes = c.calificacionPonderada;
			// Las aprobadas no se recalculan: el sistema sale de inmediato.
			const eraAprobada = c.estado === 'aprobada';
			let despues: number | null = null;
			let nota = '';
			try {
				if (eraAprobada) await db.calificacionPeriodo.update({ where: { id: c.id }, data: { estado: 'borrador' } });
				await generarCalificacionFuncionario(c.funcionarioId, c.periodo);
				const nueva = await db.calificacionPeriodo.findFirst({
					where: { id: c.id },
					include: { calificaciones: { include: { despacho: true, subfactores: true } } },
				});
				despues = nueva?.calificacionPonderada ?? null;
				for (const cd of nueva?.calificaciones ?? []) {
					for (const s of cd.subfactores) {
						detalle.push([
							c.funcionario.nombre,
							c.periodo,
							cd.despacho.nombre,
							cd.despacho.codigo,
							cd.diasHabilesDespacho,
							cd.diasLaborados,
							cd.cargaEfectivaTotal,
							cd.egresoEfectivoTotal,
							s.subfactor,
							Number(s.cargaBaseCalificacionDespacho.toFixed(2)),
							s.egresoFuncionario,
							Number(s.totalSubfactor.toFixed(2)),
						]);
					}
				}
			} catch (e) {
				nota = 'No se pudo recalcular: ' + (e instanceof Error ? e.message.slice(0, 120) : '');
			} finally {
				if (eraAprobada) {
					await db.calificacionPeriodo.update({
						where: { id: c.id },
						data: { estado: 'aprobada', calificacionPonderada: antes },
					});
					nota = nota || 'APROBADA — la cifra actual no se modifica sola; requiere decisión administrativa';
				}
			}
			resumen.push([
				c.funcionario.nombre,
				c.funcionario.documento,
				c.periodo,
				c.estado,
				Number(antes.toFixed(2)),
				despues === null ? '' : Number(despues.toFixed(2)),
				despues === null ? '' : Number((despues - antes).toFixed(2)),
				nota,
			]);
		}

		// Ordenar SOLO las filas de datos: la primera es el encabezado.
		const encabezado = resumen[0];
		const filas = resumen.slice(1).sort((a, b) => String(a[0]).localeCompare(String(b[0])) || Number(a[2]) - Number(b[2]));
		const resumenOrdenado = [encabezado, ...filas];
		const buffer = xlsx.build([
			{ name: 'Resumen', data: resumenOrdenado, options: {} },
			{ name: 'Detalle por subfactor', data: detalle, options: {} },
		]);
		writeFileSync(SALIDA, buffer);
		console.log(`\n  ${resumen.length - 1} calificaciones en el informe`);
		console.log(`  ${detalle.length - 1} filas de detalle`);
		console.log(`  archivo: ${SALIDA}\n`);
		expect(resumen.length).toBeGreaterThan(1);
	});
});
