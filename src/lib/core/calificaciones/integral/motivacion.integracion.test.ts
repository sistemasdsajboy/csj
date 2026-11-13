import { db } from '$lib/server/db-client';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { datosDelFuncionario, datosEficiencia } from './datos';
import { motivacionEficiencia } from './motivacion-eficiencia';

// PRUEBA sobre una copia LOCAL de producción: genera la motivación del factor
// eficiencia de todas las calificaciones de un periodo y comprueba que ningún
// texto salga con datos vacíos. Solo lee.
const url = process.env.DATABASE_URL ?? '';
const esLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);
const activa = process.env.PRUEBA_INTEGRACION === '1' && esLocal;
const salida = process.env.SALIDA_MOTIVACION;
const periodo = Number(process.env.PERIODO_MOTIVACION ?? 2025);

describe.skipIf(!activa)('motivación del factor eficiencia sobre datos reales', () => {
	it('se genera para todas las calificaciones del periodo sin datos vacíos', { timeout: 900000 }, async () => {
		const calificaciones = await db.calificacionPeriodo.findMany({
			where: { periodo, estado: { notIn: ['eliminada'] }, calificaciones: { some: {} } },
			include: { funcionario: { select: { nombre: true } } },
		});
		const variantes: Record<string, number> = {};
		const cuenta = (k: string) => (variantes[k] = (variantes[k] ?? 0) + 1);
		const problemas: string[] = [];
		const muestras: string[] = [];

		for (const c of calificaciones) {
			const f = await datosDelFuncionario(c.funcionarioId);
			const e = await datosEficiencia(c.id);
			const texto = motivacionEficiencia({ genero: f.genero, despachos: e.despachos, ponderada: e.ponderada }).join('\n');
			if (/NaN|undefined|Infinity|null/.test(texto))
				problemas.push(`${c.funcionario.nombre}: ${texto.match(/.{0,60}(NaN|undefined|Infinity|null).{0,20}/)?.[0]}`);
			if (texto.includes('supera la capacidad máxima de respuesta proporcional')) cuenta('carga supera capacidad');
			if (texto.includes('por ser inferior a la carga proporcional')) cuenta('carga del funcionario menor');
			if (texto.includes('parágrafo 2.º del artículo 39') || texto.includes('literal a del artículo 39')) cuenta('tope de 40/45');
			if (texto.includes('Sistema Escritural')) cuenta('con escrito');
			if (texto.includes('Control de Garantías')) cuenta('control de garantías');
			if (e.despachos.length > 1) cuenta('varios despachos');
			if (e.despachos.some((d) => [d.oral, d.escrito, d.garantias].some((s) => s && s.egreso && !s.desglose)))
				cuenta('egreso sin desglose');
			if (e.despachos.some((d) => d.descuentos)) cuenta('con días descontados');
			if (muestras.length < 400) muestras.push(`##### ${c.funcionario.nombre} (${c.estado})\n${texto}\n`);
		}

		console.log(`calificaciones ${periodo}: ${calificaciones.length}`, JSON.stringify(variantes));
		if (problemas.length) console.log('PROBLEMAS:\n' + problemas.join('\n'));
		if (salida) writeFileSync(salida, muestras.join('\n'));
		expect(problemas).toEqual([]);
	});
});
