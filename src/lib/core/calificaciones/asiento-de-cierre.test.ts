import { describe, expect, it } from 'vitest';
import { descartarAsientosDeCierre, esAsientoDeCierre, type FilaDeTramo } from './asiento-de-cierre';

const fila = (over: Partial<FilaDeTramo> = {}): FilaDeTramo => ({
	funcionarioId: 'F1',
	desde: new Date('2025-01-01T00:00:00Z'),
	hasta: new Date('2025-01-12T00:00:00Z'),
	ingresoEfectivo: 0,
	egresoEfectivo: 0,
	inventarioFinal: 0,
	...over,
});

// El tramo real de WILSON URIEL ORTEGA PEÑA, 1 al 12 de enero de 2025.
const cierreReal = [
	fila({ ingresoEfectivo: -3 }),
	fila({ ingresoEfectivo: -2 }),
	fila({ ingresoEfectivo: -283 }),
	fila({ ingresoEfectivo: -46 }),
	fila({ ingresoEfectivo: -239 }),
	fila({ ingresoEfectivo: 0 }),
];

describe('esAsientoDeCierre', () => {
	it('reconoce el traspaso de inventario por cambio de código', () => {
		expect(esAsientoDeCierre(cierreReal)).toBe(true);
	});

	it('un tramo sin actividad NO es un asiento de cierre', () => {
		// Nadie trabajó, pero tampoco se traspasó nada: el ingreso es cero, no
		// negativo. Ese tramo se conserva.
		expect(esAsientoDeCierre([fila(), fila()])).toBe(false);
	});

	it('si hubo egreso, hubo trabajo: no se descarta', () => {
		expect(esAsientoDeCierre([fila({ ingresoEfectivo: -283, egresoEfectivo: 4 })])).toBe(false);
	});

	it('si queda inventario final, el despacho no se cerró', () => {
		expect(esAsientoDeCierre([fila({ ingresoEfectivo: -283, inventarioFinal: 10 })])).toBe(false);
	});

	it('un trimestre normal no se descarta', () => {
		const trimestre = [
			fila({
				desde: new Date('2025-01-13T00:00:00Z'),
				hasta: new Date('2025-03-31T00:00:00Z'),
				ingresoEfectivo: 177,
				egresoEfectivo: 102,
				inventarioFinal: 1237,
			}),
		];
		expect(esAsientoDeCierre(trimestre)).toBe(false);
	});

	it('sin filas no decide que sí', () => {
		expect(esAsientoDeCierre([])).toBe(false);
	});
});

describe('descartarAsientosDeCierre', () => {
	const trimestre = (desde: string, hasta: string, funcionarioId = 'F1') => [
		fila({
			funcionarioId,
			desde: new Date(desde),
			hasta: new Date(hasta),
			ingresoEfectivo: 177,
			egresoEfectivo: 102,
			inventarioFinal: 1237,
		}),
	];

	it('descarta el tramo de cierre y conserva el resto del año', () => {
		const registros = [...cierreReal, ...trimestre('2025-01-13T00:00:00Z', '2025-03-31T00:00:00Z')];
		const { conservados, descartados } = descartarAsientosDeCierre(registros);
		expect(descartados).toHaveLength(cierreReal.length);
		expect(conservados).toHaveLength(1);
		expect(conservados[0].egresoEfectivo).toBe(102);
	});

	it('decide por tramo entero, no fila por fila', () => {
		// Dentro del cierre hay filas con ingreso 0. Si se mirara fila a fila se
		// conservarían, y el tramo quedaría partido por la mitad.
		const { descartados } = descartarAsientosDeCierre(cierreReal);
		expect(descartados).toHaveLength(cierreReal.length);
	});

	it('no mezcla funcionarios: el cierre de uno no descarta el tramo del otro', () => {
		const otro = trimestre('2025-01-01T00:00:00Z', '2025-01-12T00:00:00Z', 'F2');
		const { conservados, descartados } = descartarAsientosDeCierre([...cierreReal, ...otro]);
		expect(descartados).toHaveLength(cierreReal.length);
		expect(conservados).toEqual(otro);
	});

	it('sin ningún cierre no descarta nada', () => {
		const registros = [
			...trimestre('2025-01-13T00:00:00Z', '2025-03-31T00:00:00Z'),
			...trimestre('2025-04-01T00:00:00Z', '2025-06-30T00:00:00Z'),
		];
		const { conservados, descartados } = descartarAsientosDeCierre(registros);
		expect(descartados).toHaveLength(0);
		expect(conservados).toHaveLength(2);
	});

	it('devuelve lo conservado en orden de fecha: el cálculo deduce el rango del primero y el último', () => {
		const registros = [
			...trimestre('2025-10-01T00:00:00Z', '2025-12-31T00:00:00Z'),
			...cierreReal,
			...trimestre('2025-01-13T00:00:00Z', '2025-03-31T00:00:00Z'),
		];
		const { conservados } = descartarAsientosDeCierre(registros);
		expect(conservados[0].desde.toISOString().slice(0, 10)).toBe('2025-01-13');
		expect(conservados[conservados.length - 1].hasta.toISOString().slice(0, 10)).toBe('2025-12-31');
	});
});
