import type { RegistroCalificacion } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

// El módulo importa el cliente de Prisma. Se reemplaza para que ninguna prueba
// pueda construirlo ni abrir una conexión: aquí solo se comprueban las
// funciones que deciden, que no tocan la base.
vi.mock('$lib/server/db-client', () => ({ db: {} }));

import { clasificarReclasificacion, clasificarRepetidas, codigosAnterioresTrasFusion, elegirVigente } from './fusionar-despachos';

const reg = (over: Partial<RegistroCalificacion> = {}): RegistroCalificacion =>
	({
		id: 'r1',
		periodo: 2025,
		despachoId: 'D1',
		funcionarioId: 'F1',
		clase: 'oral',
		categoria: 'Movimiento de Tutelas',
		desde: new Date('2025-01-01T00:00:00Z'),
		hasta: new Date('2025-03-31T00:00:00Z'),
		dias: null,
		inventarioInicial: 10,
		ingresoEfectivo: 20,
		cargaEfectiva: 30,
		egresoEfectivo: 25,
		conciliaciones: 0,
		inventarioFinal: 5,
		restan: 0,
		cargaBruta: 30,
		calificacionId: null,
		...over,
	}) as RegistroCalificacion;

describe('elegirVigente', () => {
	it('conserva el del registro más reciente', () => {
		const { vigente, absorbidos } = elegirVigente([
			{ codigo: 'viejo', ultimoRegistro: new Date('2025-01-12') },
			{ codigo: 'nuevo', ultimoRegistro: new Date('2025-12-31') },
		]);
		expect(vigente.codigo).toBe('nuevo');
		expect(absorbidos.map((a) => a.codigo)).toEqual(['viejo']);
	});

	it('un despacho sin registros nunca gana', () => {
		const { vigente } = elegirVigente([
			{ codigo: 'sin-datos', ultimoRegistro: null },
			{ codigo: 'con-datos', ultimoRegistro: new Date('2023-01-01') },
		]);
		expect(vigente.codigo).toBe('con-datos');
	});
});

describe('clasificarRepetidas', () => {
	it('descarta la copia cuando las cifras coinciden', () => {
		const enVigente = reg({ id: 'a' });
		const enViejo = reg({ id: 'b', despachoId: 'D2' });
		const r = clasificarRepetidas([enVigente], [enViejo]);
		expect(r.aDescartar).toEqual(['b']);
		expect(r.enConflicto).toHaveLength(0);
	});

	it('NO decide cuando las cifras difieren', () => {
		const enVigente = reg({ id: 'a', egresoEfectivo: 25 });
		const enViejo = reg({ id: 'b', despachoId: 'D2', egresoEfectivo: 99 });
		const r = clasificarRepetidas([enVigente], [enViejo]);
		expect(r.aDescartar).toHaveLength(0);
		expect(r.enConflicto).toHaveLength(1);
	});

	it('deja pasar las filas que no chocan', () => {
		const enVigente = reg({ id: 'a', desde: new Date('2025-01-01T00:00:00Z') });
		const enViejo = reg({ id: 'b', despachoId: 'D2', desde: new Date('2025-04-01T00:00:00Z') });
		const r = clasificarRepetidas([enVigente], [enViejo]);
		expect(r.aDescartar).toHaveLength(0);
		expect(r.enConflicto).toHaveLength(0);
	});

	it('una fecha de inicio distinta no es un choque, aunque todo lo demás coincida', () => {
		// El índice único incluye la fecha de inicio: dos periodos distintos
		// nunca chocan. Chocan cuando el mismo periodo se reportó dos veces.
		const enVigente = reg({ id: 'a', desde: new Date('2025-01-01T00:00:00Z') });
		const enViejo = reg({ id: 'b', despachoId: 'D2', desde: new Date('2025-01-02T00:00:00Z') });
		expect(clasificarRepetidas([enVigente], [enViejo]).aDescartar).toHaveLength(0);
	});
});

describe('clasificarReclasificacion', () => {
	it('ve el choque que aparece al pasar de oral a tutelas', () => {
		// Con clases distintas no violan el índice único, así que
		// clasificarRepetidas no las ve. Al reclasificar la segunda, chocan.
		const yaTutelas = reg({ id: 'a', clase: 'tutelas' });
		const todaviaOral = reg({ id: 'b', clase: 'oral' });
		const r = clasificarReclasificacion([yaTutelas, todaviaOral]);
		expect(r.aDescartar).toEqual(['b']);
	});

	it('no toca las categorías que no se reclasifican', () => {
		const a = reg({ id: 'a', clase: 'tutelas', categoria: 'Primera Instancia Civil' });
		const b = reg({ id: 'b', clase: 'oral', categoria: 'Primera Instancia Civil' });
		expect(clasificarReclasificacion([a, b]).aDescartar).toHaveLength(0);
	});

	it('NO decide cuando las cifras difieren', () => {
		const yaTutelas = reg({ id: 'a', clase: 'tutelas', egresoEfectivo: 25 });
		const todaviaOral = reg({ id: 'b', clase: 'oral', egresoEfectivo: 99 });
		const r = clasificarReclasificacion([yaTutelas, todaviaOral]);
		expect(r.aDescartar).toHaveLength(0);
		expect(r.enConflicto).toHaveLength(1);
	});
});

describe('codigosAnterioresTrasFusion', () => {
	it('anota el código que desaparece', () => {
		expect(codigosAnterioresTrasFusion({ codigo: 'nuevo' }, [{ codigo: 'viejo' }])).toEqual(['viejo']);
	});

	it('no anota el código propio', () => {
		// Puede llegar si el mismo código quedó registrado dos veces.
		expect(codigosAnterioresTrasFusion({ codigo: 'igual' }, [{ codigo: 'igual' }])).toEqual([]);
	});

	it('conserva lo que el despacho ya recordaba y no lo repite', () => {
		const r = codigosAnterioresTrasFusion({ codigo: 'c', codigosAnteriores: ['a'] }, [{ codigo: 'b', codigosAnteriores: ['a'] }]);
		expect(r).toEqual(['a', 'b']);
	});

	it('encadena los códigos de un juzgado que cambió dos veces', () => {
		const primera = codigosAnterioresTrasFusion({ codigo: 'b' }, [{ codigo: 'a' }]);
		const segunda = codigosAnterioresTrasFusion({ codigo: 'c' }, [{ codigo: 'b', codigosAnteriores: primera }]);
		expect(segunda).toEqual(['a', 'b']);
	});
});
