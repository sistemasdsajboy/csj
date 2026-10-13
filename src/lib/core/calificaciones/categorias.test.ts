import { describe, expect, it } from 'vitest';
import { CATEGORIAS_CONSTITUCIONAL, CATEGORIAS_PENAL_ESCRITO, CATEGORIAS_TUTELAS, categoriasGuardadasDe, esCategoria } from './categorias';

// Los nombres de estas pruebas son los que hay guardados en producción
// (revisado el 2026-10-13). SIERJU no escribe siempre igual la misma categoría.

describe('esCategoria — reconoce el nombre como sea que venga escrito', () => {
	it('las tutelas en MAYÚSCULAS, como llegó el consolidado de 2025 que dejó una calificación en 5', () => {
		expect(esCategoria('MOVIMIENTO DE TUTELAS', CATEGORIAS_TUTELAS)).toBe(true);
		expect(esCategoria('INCIDENTES DE DESACATO', CATEGORIAS_TUTELAS)).toBe(true);
	});

	it('las demás variantes vistas en producción', () => {
		expect(esCategoria('Incidentes De Desacato', CATEGORIAS_TUTELAS)).toBe(true);
		expect(esCategoria('Movimiento de impugnaciones', CATEGORIAS_TUTELAS)).toBe(true);
		expect(esCategoria('primera instancia acciones constitucionales', CATEGORIAS_CONSTITUCIONAL)).toBe(true);
		expect(esCategoria('Primera instancia acciones constitucionales', CATEGORIAS_CONSTITUCIONAL)).toBe(true);
		expect(esCategoria('PRIMERA INSTANCIA ACCIONES CONSTITUCIONALES', CATEGORIAS_CONSTITUCIONAL)).toBe(true);
		expect(esCategoria('segunda Instancia Acciones Constitucionales', CATEGORIAS_PENAL_ESCRITO)).toBe(true);
		expect(esCategoria('sEGUNDA INSTANCIA ACCIONES CONSTITUCIONALES', CATEGORIAS_PENAL_ESCRITO)).toBe(true);
	});

	it('sin tildes y con espacios de más', () => {
		expect(esCategoria('segunda Instancia Ejecucion de penas y medidas de seguridad ccto', CATEGORIAS_PENAL_ESCRITO)).toBe(true);
		expect(esCategoria('Procesos con sentencia y tramite posterior incidentes de Desacato', CATEGORIAS_TUTELAS)).toBe(true);
		expect(esCategoria('  Movimiento  de   Tutelas ', CATEGORIAS_TUTELAS)).toBe(true);
	});

	it('el nombre exacto de siempre sigue reconociéndose', () => {
		for (const c of CATEGORIAS_TUTELAS) expect(esCategoria(c, CATEGORIAS_TUTELAS)).toBe(true);
		for (const c of CATEGORIAS_CONSTITUCIONAL) expect(esCategoria(c, CATEGORIAS_CONSTITUCIONAL)).toBe(true);
		for (const c of CATEGORIAS_PENAL_ESCRITO) expect(esCategoria(c, CATEGORIAS_PENAL_ESCRITO)).toBe(true);
	});
});

describe('esCategoria — no confunde categorías distintas', () => {
	it('primera y segunda instancia constitucional son listas distintas', () => {
		expect(esCategoria('Primera Instancia Acciones Constitucionales', CATEGORIAS_PENAL_ESCRITO)).toBe(false);
		expect(esCategoria('Segunda Instancia Acciones Constitucionales', CATEGORIAS_CONSTITUCIONAL)).toBe(false);
	});

	it('las categorías ordinarias no entran en ninguna lista', () => {
		for (const c of ['Primera Instancia Conocimiento - Ley 906', 'PRIMERA INSTANCIA CONOCIMIENTO LEY 1826 PARA ADULTOS', 'Consolidado', ''])
			for (const lista of [CATEGORIAS_TUTELAS, CATEGORIAS_CONSTITUCIONAL, CATEGORIAS_PENAL_ESCRITO])
				expect(esCategoria(c, lista)).toBe(false);
	});

	it('no reconoce por parecido: tiene que ser el mismo nombre', () => {
		expect(esCategoria('Movimiento de Tutelas y Habeas Corpus', CATEGORIAS_TUTELAS)).toBe(false);
		expect(esCategoria('Tutelas', CATEGORIAS_TUTELAS)).toBe(false);
	});
});

describe('categoriasGuardadasDe', () => {
	it('devuelve el texto EXACTO guardado, que es lo que la consulta a la base necesita', () => {
		const guardadas = ['MOVIMIENTO DE TUTELAS', 'PRIMERA INSTANCIA CONOCIMIENTO - LEY 906', 'INCIDENTES DE DESACATO'];
		expect(categoriasGuardadasDe(CATEGORIAS_TUTELAS, guardadas)).toEqual(['MOVIMIENTO DE TUTELAS', 'INCIDENTES DE DESACATO']);
	});

	it('si conviven dos escrituras, devuelve las dos', () => {
		const guardadas = ['Movimiento de Tutelas', 'MOVIMIENTO DE TUTELAS'];
		expect(categoriasGuardadasDe(CATEGORIAS_TUTELAS, guardadas)).toEqual(['Movimiento de Tutelas', 'MOVIMIENTO DE TUTELAS']);
	});

	it('no repite', () => {
		expect(categoriasGuardadasDe(CATEGORIAS_TUTELAS, ['MOVIMIENTO DE TUTELAS', 'MOVIMIENTO DE TUTELAS'])).toEqual([
			'MOVIMIENTO DE TUTELAS',
		]);
	});

	it('sin coincidencias devuelve una lista vacía', () => {
		expect(categoriasGuardadasDe(CATEGORIAS_TUTELAS, ['Primera Instancia Civil'])).toEqual([]);
	});

	it('la comparación exacta de antes NO las encontraba: ese era el fallo', () => {
		expect(CATEGORIAS_TUTELAS.includes('MOVIMIENTO DE TUTELAS')).toBe(false);
	});
});
