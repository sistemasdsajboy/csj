import { describe, expect, it, vi } from 'vitest';

// El módulo importa el cliente de Prisma. Se reemplaza para que ninguna prueba
// pueda construirlo ni abrir una conexión.
vi.mock('$lib/server/db-client', () => ({ db: {} }));

import { calcularPonderada } from './generar-calificacion';

const c = (diasLaborados: number, calificacionTotalFactorEficiencia: number) => ({
	diasLaborados,
	calificacionTotalFactorEficiencia,
});

// PRUEBAS DE CARACTERIZACIÓN
//
// Fijan lo que el cálculo hace HOY, antes de tocarlo. No afirman que el
// resultado sea el que la norma exige: afirman que no cambió. Si una de estas
// falla después de una modificación, esa modificación alteró una calificación.
describe('calcularPonderada — comportamiento actual', () => {
	it('sin calificaciones da 0', () => {
		expect(calcularPonderada([])).toBe(0);
		expect(calcularPonderada()).toBe(0);
	});

	it('con una sola calificación devuelve la suya, sin ponderar', () => {
		expect(calcularPonderada([c(200, 37.5)])).toBe(37.5);
	});

	it('con una sola calificación la devuelve aunque tenga cero días laborados', () => {
		// Importante: este atajo es lo que evita dividir por cero en el caso
		// más común de un solo despacho.
		expect(calcularPonderada([c(0, 37.5)])).toBe(37.5);
	});

	it('pondera por días laborados', () => {
		// (30/250)*100 + (36/250)*150 = 12 + 21.6
		expect(calcularPonderada([c(100, 30), c(150, 36)])).toBeCloseTo(33.6, 10);
	});

	it('con días iguales equivale al promedio simple', () => {
		expect(calcularPonderada([c(100, 30), c(100, 40)])).toBeCloseTo(35, 10);
	});

	it('un tramo de cero días no aporta nada, pero no estorba', () => {
		expect(calcularPonderada([c(0, 10), c(200, 40)])).toBeCloseTo(40, 10);
	});

	it('reparte entre tres despachos según sus días', () => {
		// (24/300)*60 + (30/300)*90 + (45/300)*150 = 4.8 + 9 + 22.5
		expect(calcularPonderada([c(60, 24), c(90, 30), c(150, 45)])).toBeCloseTo(36.3, 10);
	});

	it('no depende del orden de las calificaciones', () => {
		const a = calcularPonderada([c(100, 30), c(150, 36)]);
		const b = calcularPonderada([c(150, 36), c(100, 30)]);
		expect(a).toBeCloseTo(b, 10);
	});
});

describe('calcularPonderada — protección contra la división por cero', () => {
	it('falla con un mensaje claro si ningún despacho tiene días laborados', () => {
		// Antes de la protección esto daba NaN: (10/0)*0 = NaN. Prisma lo
		// rechazaba con "Argument calificacionPonderada is missing", un mensaje
		// que no le dice nada a quien genera la calificación.
		expect(() => calcularPonderada([c(0, 10), c(0, 40)])).toThrowError(/suman 0 días laborados/);
	});

	it('el mensaje apunta a la causa probable: el historial partido', () => {
		expect(() => calcularPonderada([c(0, 10), c(0, 40)])).toThrowError(/partido/);
	});

	it('nunca devuelve 0 en ese caso, que se confundiría con una calificación real', () => {
		let resultado: number | undefined;
		try {
			resultado = calcularPonderada([c(0, 10), c(0, 40)]);
		} catch {
			resultado = undefined;
		}
		expect(resultado).toBeUndefined();
	});

	it('tampoco pondera con días laborados negativos', () => {
		expect(() => calcularPonderada([c(-100, 10), c(100, 40)])).toThrowError(/días laborados/);
	});
});
