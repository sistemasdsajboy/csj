import { describe, expect, it } from 'vitest';
import { formatoParrafo } from './formato-parrafos';
import { conGenero } from './redaccion';

const negrillas = (texto: string) =>
	formatoParrafo(texto, true)
		.partes.filter((p) => p.n)
		.map((p) => p.t);

describe('negrilla y centrado en el Word', () => {
	it('los textos que se digitan salen tal cual', () => {
		expect(formatoParrafo('El resultado de 39,42 puntos = 39,42', false)).toEqual({
			centrado: false,
			partes: [{ t: 'El resultado de 39,42 puntos = 39,42', n: false }],
		});
	});

	it('despacho 2: la fórmula centrada y su resultado en negrilla; la fórmula general sin negrilla', () => {
		expect(formatoParrafo('(111 / 141,00) × 40 = 31,49', true)).toEqual({
			centrado: true,
			partes: [
				{ t: '(111 / 141,00) × 40 = ', n: false },
				{ t: '31,49', n: true },
			],
		});
		expect(negrillas('(Egreso base de calificación / Carga base de calificación) × 40 = puntaje subfactor')).toEqual([]);
		expect(formatoParrafo('((15 + 0) / 15) × 5 = 5,00', true).centrado).toBe(true);
	});

	it('títulos y totales enteros en negrilla', () => {
		for (const t of [
			'A. Factor Eficiencia o Rendimiento – Sistema Oral',
			'TOTAL FACTOR EFICIENCIA O RENDIMIENTO: 40,52 puntos',
			'FACTOR EFICIENCIA O RENDIMIENTO SISTEMA ORAL',
			'SUBFACTOR CONTROL DE GARANTÍAS:',
			'PONDERACIÓN',
			'JUZGADO 001 PROMISCUO MUNICIPAL DE VENTAQUEMADA: Período 01/01/2025 - 31/12/2025',
		])
			expect(formatoParrafo(t, true).partes).toEqual([{ t, n: true }]);
	});

	it('despacho 1: el nombre del subfactor y los resultados', () => {
		expect(negrillas('- Subfactor Respuesta Efectiva a la demanda de justicia: Carga total del despacho: 310 procesos')).toEqual([
			'- Subfactor Respuesta Efectiva a la demanda de justicia:',
		]);
		expect(
			negrillas('Respuesta efectiva demanda de justicia: egreso base calificación: 182 / Carga proporcional: 310 X 40 = 23,48.')
		).toEqual(['23,48']);
		expect(
			negrillas(
				'... egreso base calificación: 46 / Carga proporcional: 45,80 X 45 = 45,20; como el egreso supera la carga base, el puntaje es de 45,00, conforme al parágrafo 2.º'
			)
		).toEqual(['45,20', '45,00']);
		expect(negrillas('Total subfactores RESPUESTA EFECTIVA A LA DEMANDA DE JUSTICIA: 28,48.')).toEqual(['28,48']);
		expect(negrillas('... corresponde a 89 puntos, es decir, una calificación SATISFACTORIA')).toEqual(['89 puntos']);
	});

	it('las partes, juntas, son el texto original', () => {
		const t = 'PUNTAJE DEL SUBFACTOR: ... / audiencias programadas X 5 = (164 + 77 + 9) / 250 X 5 = 5,00.';
		expect(
			formatoParrafo(t, true)
				.partes.map((p) => p.t)
				.join('')
		).toBe(t);
	});
});

describe('género en textos escritos sin él', () => {
	it('pone el género elegido en las formas dobles', () => {
		const t =
			'La motivación del factor calidad del (de la) funcionario (a) se encuentra... El (la) funcionario (a) no presentó publicaciones.';
		expect(conGenero(t, 'femenino')).toBe(
			'La motivación del factor calidad de la funcionaria se encuentra... La funcionaria no presentó publicaciones.'
		);
		expect(conGenero(t, 'masculino')).toBe(
			'La motivación del factor calidad del funcionario se encuentra... El funcionario no presentó publicaciones.'
		);
	});

	it('sin género elegido, el texto queda igual', () => {
		expect(conGenero('del (de la) funcionario (a)', null)).toBe('del (de la) funcionario (a)');
	});
});
