import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { createRegistrosCalificacionFromXlsx } from './carga-xlsx';
import { generarCalificacionFuncionario } from './generar-calificacion';

// PRUEBA DE INTEGRACIÓN — carga consolidados REALES contra la copia de
// desarrollo. Nunca contra producción.
const url = process.env.DATABASE_URL ?? '';
const activa = process.env.PRUEBA_INTEGRACION === '1' && /csj-desarrollo|127\.0\.0\.1|ac-wmgm4fk-shard/.test(url);

const BASE = 'docs-internos';
const GRUPOS = ['Despacho 1', 'Despacho 2'];
const CODIGOS = ['156004089001', '156933187002', '157593103001', '850014105001'];

/**
 * Busca el archivo de la carpeta "Calificado" del despacho.
 *
 * Es el formato que espera el importador: hojas Oral / Escrito / Otros /
 * Garantias / Audiencias, y en la primera celda "Despacho: <codigo> - <nombre>".
 * El de la carpeta "Consolidado" es un formato intermedio de SIERJU —hojas TMP,
 * Inventarios, Total…— y el importador lo rechaza.
 */
function rutaCalificado(codigo: string): string | null {
	for (const grupo of GRUPOS) {
		const dirGrupo = `${BASE}/${grupo}`;
		if (!existsSync(dirGrupo)) continue;
		for (const carpeta of readdirSync(dirGrupo)) {
			if (!carpeta.endsWith(codigo)) continue;
			const dir = `${dirGrupo}/${carpeta}/Calificado`;
			if (!existsSync(dir)) continue;
			const archivo = readdirSync(dir).find((a) => /\.xlsx?$/i.test(a));
			if (archivo) return `${dir}/${archivo}`;
		}
	}
	return null;
}

describe.skipIf(!activa)('cargar consolidados reales', () => {
	it('entran sin crear despachos ni funcionarios de mas', { timeout: 600000 }, async () => {
		const despachosAntes = await db.despacho.count();
		const funcionariosAntes = await db.funcionario.count();

		for (const codigo of CODIGOS) {
			const ruta = rutaCalificado(codigo);
			if (!ruta) {
				console.log(`\n  ${codigo}  sin archivo en Calificado`);
				continue;
			}
			const archivo = new File([readFileSync(ruta)], ruta.split('/').pop()!);
			try {
				const r = await createRegistrosCalificacionFromXlsx(archivo);
				console.log(`\n  ${codigo}  ${r.despacho}  periodo ${r.periodo}`);
				console.log(`     ${r.countCreados} creados, ${r.countEliminados} eliminados`);
				for (const a of r.avisos) console.log(`     AVISO: ${a}`);
			} catch (e) {
				console.log(`\n  ${codigo}  ERROR: ${e instanceof Error ? e.message : String(e)}`);
			}
		}

		const despachosDespues = await db.despacho.count();
		const funcionariosDespues = await db.funcionario.count();
		console.log(`\n  despachos ${despachosAntes} a ${despachosDespues}   funcionarios ${funcionariosAntes} a ${funcionariosDespues}\n`);

		// Lo esencial: cargar archivos reales no debe abrir registros de mas.
		expect(despachosDespues).toBe(despachosAntes);
	});

	it('las calificaciones que fallaban ahora se generan', { timeout: 600000 }, async () => {
		for (const nombre of ['CAROLINA ROSAS NARANJO', 'RAFAEL ANDRES VARGAS ORTEGA']) {
			const f = await db.funcionario.findFirst({ where: { nombre } });
			if (!f) {
				console.log(`  ${nombre}: no existe`);
				continue;
			}
			try {
				const id = await generarCalificacionFuncionario(f.id, 2025);
				const c = await db.calificacionPeriodo.findFirst({
					where: { id },
					include: { calificaciones: { include: { despacho: true } } },
				});
				console.log(
					`  ${nombre} · 2025 · ponderada ${c?.calificacionPonderada?.toFixed(2)}` +
						`  despachos: ${c?.calificaciones.map((x) => x.despacho.codigo).join(', ')}`
				);
			} catch (e) {
				console.log(`  ${nombre}: ERROR ${e instanceof Error ? e.message.slice(0, 90) : ''}`);
			}
		}
		expect(true).toBe(true);
	});
});
