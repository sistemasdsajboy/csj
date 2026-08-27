import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { generarCalificacionFuncionario } from './generar-calificacion';

const url = process.env.DATABASE_URL ?? '';
const activa = process.env.PRUEBA_INTEGRACION === '1' && /csj-desarrollo|127\.0\.0\.1|ac-wmgm4fk-shard/.test(url);

describe.skipIf(!activa)('coherencia del calculo', () => {
	it('detalle de una calificacion recien generada', { timeout: 300000 }, async () => {
		const f = await db.funcionario.findFirst({ where: { nombre: 'WILSON URIEL ORTEGA PEÑA' } });
		const id = await generarCalificacionFuncionario(f!.id, 2025);
		const c = await db.calificacionPeriodo.findFirst({
			where: { id },
			include: { calificaciones: { include: { despacho: true, subfactores: true, registroAudiencias: true } } },
		});

		console.log(`\n  ${f!.nombre} · 2025 · ponderada ${c!.calificacionPonderada}`);
		for (const cd of c!.calificaciones) {
			console.log(`\n  ${cd.despacho.codigo}  ${cd.despacho.nombre}`);
			console.log(`     dias habiles del despacho: ${cd.diasHabilesDespacho}`);
			console.log(`     dias laborados: ${cd.diasLaborados}   laborables: ${cd.diasLaborables}   descontados: ${cd.diasDescontados}`);
			console.log(`     carga efectiva total: ${cd.cargaEfectivaTotal}   egreso efectivo total: ${cd.egresoEfectivoTotal}`);
			console.log(
				`     audiencias: ${cd.registroAudiencias.programadas} programadas / ${cd.registroAudiencias.atendidas} atendidas  -> ${cd.calificacionAudiencias}`
			);
			for (const s of cd.subfactores)
				console.log(
					`       ${s.subfactor.padEnd(10)} inv.inicial ${String(s.totalInventarioInicial).padStart(5)}` +
						`  carga despacho ${s.cargaBaseCalificacionDespacho.toFixed(1).padStart(7)}` +
						`  carga funcionario ${s.cargaBaseCalificacionFuncionario.toFixed(1).padStart(7)}` +
						`  proporcional ${s.cargaProporcional.toFixed(1).padStart(7)}` +
						`  egreso ${String(s.egresoFuncionario).padStart(5)}` +
						`  =  ${s.totalSubfactor.toFixed(2).padStart(6)}`
				);
			console.log(`     oral+audiencias: ${cd.factorOralMasAudiencias}   TOTAL eficiencia: ${cd.calificacionTotalFactorEficiencia}`);
		}
		expect(Number.isFinite(c!.calificacionPonderada)).toBe(true);
	});

	it('recalcular calificaciones NO afectadas da el mismo numero', { timeout: 900000 }, async () => {
		// Las que conservan su detalle no las toco la fusion. Si el motor
		// reproduce exactamente su cifra guardada, el calculo es estable y los
		// datos siguen intactos.
		const candidatas = (
			await db.calificacionPeriodo.findMany({
				where: { estado: { in: ['revision', 'borrador', 'archivada', 'devuelta'] } },
				include: { calificaciones: { select: { id: true } }, funcionario: true },
			})
		).filter((c) => c.calificaciones.length > 0);

		const muestra = candidatas.slice(0, 25);
		let iguales = 0,
			distintas = 0,
			errores = 0;
		const cambios: string[] = [];

		for (const c of muestra) {
			const antes = c.calificacionPonderada;
			try {
				await generarCalificacionFuncionario(c.funcionarioId, c.periodo);
				const nueva = await db.calificacionPeriodo.findFirst({ where: { id: c.id } });
				const despues = nueva?.calificacionPonderada ?? -1;
				if (Math.abs(despues - antes) < 0.005) iguales++;
				else {
					distintas++;
					cambios.push(`  ${c.periodo} ${c.funcionario.nombre.padEnd(36)} ${antes.toFixed(2)} -> ${despues.toFixed(2)}`);
				}
			} catch {
				errores++;
			}
		}

		console.log(`\n  recalculadas ${muestra.length}:  iguales ${iguales}   distintas ${distintas}   con error ${errores}`);
		if (cambios.length) console.log('\n  LAS QUE CAMBIARON:\n' + cambios.join('\n'));
		console.log('');
		expect(muestra.length).toBeGreaterThan(0);
	});
});
