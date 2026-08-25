import { describe, expect, it, vi } from 'vitest';

// El módulo importa el cliente de Prisma. Se reemplaza para que ninguna prueba
// pueda construirlo ni abrir una conexión.
vi.mock('$lib/server/db-client', () => ({ db: {} }));

import type { RegistroCalificacion } from '@prisma/client';
import { calcularPonderada, generadorResultadosSubfactor } from './generar-calificacion';

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

// ---------------------------------------------------------------------------
// generadorResultadosSubfactor — el corazón del cálculo por subfactor.
//
// Las pruebas de este bloque fijan el comportamiento ACTUAL, calculado a mano
// a partir del código. No afirman que la norma exija estos números: afirman
// que no cambiaron. Es la red de seguridad para tocar las líneas 136-137.
// ---------------------------------------------------------------------------

const FUNC = 'F1';
const OTRO = 'F2';

const reg = (over: Partial<RegistroCalificacion> = {}): RegistroCalificacion =>
	({
		id: 'r',
		periodo: 2025,
		despachoId: 'D1',
		funcionarioId: FUNC,
		clase: 'oral',
		categoria: 'Sentencias',
		desde: new Date('2025-01-01T00:00:00Z'),
		hasta: new Date('2025-03-31T00:00:00Z'),
		dias: null,
		inventarioInicial: 0,
		ingresoEfectivo: 0,
		cargaEfectiva: 0,
		egresoEfectivo: 0,
		conciliaciones: 0,
		inventarioFinal: 0,
		restan: 0,
		cargaBruta: 0,
		calificacionId: null,
		...over,
	}) as RegistroCalificacion;

/** Un trimestre corriente: inventario 100, ingreso 50, egreso 30. */
const trimestreNormal = () => reg({ inventarioInicial: 100, ingresoEfectivo: 50, egresoEfectivo: 30 });

describe('generadorResultadosSubfactor — comportamiento actual', () => {
	it('sin registros devuelve todo en cero, sin dividir nada', () => {
		const r = generadorResultadosSubfactor(FUNC, 0, 0, false, 600)([], [], 40, 'oral');
		expect(r).toEqual({
			subfactor: 'oral',
			totalInventarioInicial: 0,
			cargaBaseCalificacionDespacho: 0,
			cargaBaseCalificacionFuncionario: 0,
			egresoFuncionario: 0,
			cargaProporcional: 0,
			totalSubfactor: 0,
		});
	});

	it('reparte la carga del despacho según los días del funcionario', () => {
		// carga base = 100 inventario + 50 ingreso = 150
		// proporcional = 150 * 100 / 200 = 75
		// capacidad     = 600 * 100 / 200 = 300
		// mínima        = min(75, 150, 300) = 75
		// total         = min(30/75 * 40, 40) = 16
		const r = generadorResultadosSubfactor(FUNC, 200, 100, false, 600)([trimestreNormal()], [], 40, 'oral');
		expect(r.cargaBaseCalificacionDespacho).toBe(150);
		expect(r.cargaProporcional).toBe(75);
		expect(r.egresoFuncionario).toBe(30);
		expect(r.totalSubfactor).toBe(16);
	});

	it('la capacidad máxima limita el subfactor oral', () => {
		// capacidad = 100 * 100 / 200 = 50, menor que la proporcional de 75
		// total = min(30/50 * 40, 40) = 24
		const r = generadorResultadosSubfactor(FUNC, 200, 100, false, 100)([trimestreNormal()], [], 40, 'oral');
		expect(r.totalSubfactor).toBe(24);
	});

	it('la capacidad máxima NO aplica a los demás subfactores', () => {
		// Mismo caso que el anterior pero en "escrito": la capacidad se excluye
		// usando Infinity, así que manda la proporcional de 75.
		const r = generadorResultadosSubfactor(FUNC, 200, 100, false, 100)([trimestreNormal()], [], 40, 'escrito');
		expect(r.totalSubfactor).toBe(16);
	});

	it('el resultado nunca supera el máximo del subfactor', () => {
		const r = generadorResultadosSubfactor(
			FUNC,
			200,
			100,
			false,
			600
		)([reg({ inventarioInicial: 100, ingresoEfectivo: 50, egresoEfectivo: 1000 })], [], 40, 'oral');
		expect(r.totalSubfactor).toBe(40);
	});

	it('con carga mínima en cero el subfactor es cero, sin dividir por cero', () => {
		// Protección que el autor sí puso, en la línea 142.
		const r = generadorResultadosSubfactor(FUNC, 200, 100, false, 600)([reg({ egresoEfectivo: 5 })], [], 40, 'oral');
		expect(r.totalSubfactor).toBe(0);
	});

	it('descuenta el egreso de otros funcionarios de la carga del calificado', () => {
		const r = generadorResultadosSubfactor(
			FUNC,
			200,
			100,
			false,
			600
		)([trimestreNormal(), reg({ funcionarioId: OTRO, egresoEfectivo: 20 })], [], 40, 'oral');
		expect(r.cargaBaseCalificacionFuncionario).toBe(130); // 150 - 20
	});
});

describe('generadorResultadosSubfactor — protección de la división por días hábiles', () => {
	it('falla con mensaje claro si el despacho no tiene días hábiles pero sí estadísticas', () => {
		expect(() => generadorResultadosSubfactor(FUNC, 0, 0, false, 600)([trimestreNormal()], [], 40, 'oral')).toThrowError(/0 días hábiles/);
	});

	it('el mensaje apunta a la causa probable: el historial partido', () => {
		expect(() => generadorResultadosSubfactor(FUNC, 0, 0, false, 600)([trimestreNormal()], [], 40, 'oral')).toThrowError(/partido/);
	});

	it('nunca devuelve un resultado en ese caso', () => {
		let r;
		try {
			r = generadorResultadosSubfactor(FUNC, 0, 0, false, 600)([trimestreNormal()], [], 40, 'oral');
		} catch {
			r = undefined;
		}
		expect(r).toBeUndefined();
	});

	it('sin estadísticas sigue devolviendo ceros, no falla', () => {
		// La salida temprana de arriba se conserva: un despacho sin registros no
		// es un error, simplemente no aporta nada.
		expect(() => generadorResultadosSubfactor(FUNC, 0, 0, false, 600)([], [], 40, 'oral')).not.toThrow();
	});

	it('cero días del FUNCIONARIO no es error: reparte cero y sigue', () => {
		// Solo el denominador es problema. Un funcionario que no laboró días en
		// el despacho da carga proporcional cero, que es correcto.
		const r = generadorResultadosSubfactor(FUNC, 200, 0, false, 600)([trimestreNormal()], [], 40, 'oral');
		expect(r.cargaProporcional).toBe(0);
		expect(r.totalSubfactor).toBe(0);
	});
});
