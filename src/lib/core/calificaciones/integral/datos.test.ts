import { describe, expect, it } from 'vitest';
import { cortesDelNombre, fraseDescuentos, separarEn, separarNombre } from './datos';

describe('frase de los días descontados', () => {
	const fecha = (s: string) => new Date(`${s}T00:00:00Z`);
	it('"un (1) día" y "veintiún (21) días", no "uno (1) día"', () => {
		expect(fraseDescuentos([{ type: 'incapacidad', from: fecha('2025-10-17'), to: fecha('2025-10-19'), diasDescontables: 1 }])).toBe(
			'un (1) día de incapacidad (del 17/10/2025 al 19/10/2025)'
		);
		expect(fraseDescuentos([{ type: 'vacaciones', from: fecha('2025-01-02'), to: fecha('2025-01-31'), diasDescontables: 21 }])).toBe(
			'veintiún (21) días de vacaciones (del 02/01/2025 al 31/01/2025)'
		);
	});
});

describe('nombre del funcionario: viene del sistema, solo se elige dónde se parte', () => {
	it('la propuesta deja las dos últimas palabras como apellidos', () => {
		expect(separarNombre('ANA MARIA PEREZ GOMEZ')).toEqual({ nombres: 'ANA MARIA', apellidos: 'PEREZ GOMEZ' });
		expect(separarNombre('ANA PEREZ')).toEqual({ nombres: 'ANA', apellidos: 'PEREZ' });
	});

	it('ofrece todas las formas de partirlo sin cambiar ninguna letra', () => {
		const cortes = cortesDelNombre('ANA MARIA DE LA HOZ');
		expect(cortes).toHaveLength(4);
		expect(cortes.find((c) => c.palabrasApellidos === 3)).toEqual({ palabrasApellidos: 3, nombres: 'ANA MARIA', apellidos: 'DE LA HOZ' });
		for (const c of cortes) expect(`${c.nombres} ${c.apellidos}`).toBe('ANA MARIA DE LA HOZ');
	});

	it('rechaza un corte que deje vacíos los nombres o los apellidos', () => {
		expect(separarEn('ANA PEREZ', 0)).toBeNull();
		expect(separarEn('ANA PEREZ', 2)).toBeNull();
		expect(separarEn('ANA PEREZ', 1.5)).toBeNull();
		expect(cortesDelNombre('ANA')).toEqual([]);
	});
});
