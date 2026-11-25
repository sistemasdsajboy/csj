import { describe, expect, it } from 'vitest';
import { motivacionEficienciaDespacho1, plantillaDe, plantillaSugerida } from './eficiencia-despacho-1';
import type { DespachoEficiencia, SubfactorEficiencia } from './motivacion-eficiencia';

// Cifras del cálculo guardado para los juzgados de los seis formatos del despacho 1 (periodo 2025).
const sub = (
	cargaDespacho: number,
	cargaFuncionario: number,
	cargaProporcional: number,
	egreso: number,
	total: number
): SubfactorEficiencia => ({
	cargaDespacho,
	cargaFuncionario,
	cargaProporcional,
	egreso,
	total,
	desglose: null,
});
const vacio = sub(0, 0, 0, 0, 0);
const despacho = (d: Partial<DespachoEficiencia> & Pick<DespachoEficiencia, 'nombre'>): DespachoEficiencia => ({
	despachoId: d.nombre,
	desde: new Date(Date.UTC(2025, 0, 1)),
	hasta: new Date(Date.UTC(2025, 11, 31)),
	diasHabilesDespacho: 228,
	diasLaborables: 228,
	diasLaborados: 228,
	descuentos: null,
	cargaEfectivaTotal: 0,
	egresoEfectivoTotal: 0,
	capacidad: null,
	conEscritos: false,
	esGarantias: false,
	oral: vacio,
	escrito: vacio,
	garantias: vacio,
	audiencias: null,
	oralMasAudiencias: 0,
	total: 0,
	...d,
});
const audiencias = (programadas: number, atendidas: number, ajenas: number, justificadas: number, puntaje: number) => ({
	programadas,
	atendidas,
	ajenas,
	justificadas,
	noJustificadas: 0,
	puntaje,
});

const civil = despacho({
	nombre: 'JUZGADO 002 CIVIL MUNICIPAL DE CHIQUINQUIRA',
	especialidad: 'Civil',
	categoria: 'Municipal',
	capacidad: 1359,
	oral: sub(739, 739, 739, 406, 21.9756),
	audiencias: audiencias(66, 55, 11, 0, 5),
	oralMasAudiencias: 26.9756,
	total: 26.9756,
});
const ventaquemada = despacho({
	nombre: 'JUZGADO 001 PROMISCUO MUNICIPAL DE VENTAQUEMADA',
	especialidad: 'Promiscuo',
	categoria: 'Municipal',
	capacidad: 593,
	conEscritos: true,
	oral: sub(310, 310, 310, 182, 23.4839),
	escrito: sub(96, 96, 96, 96, 45),
	garantias: sub(113, 113, 113, 106, 42.2124),
	audiencias: audiencias(250, 164, 77, 9, 5),
	oralMasAudiencias: 28.4839,
	total: 38.5654,
});
const motavita = despacho({
	nombre: 'JUZGADO 001 PROMISCUO MUNICIPAL DE MOTAVITA',
	especialidad: 'Promiscuo',
	categoria: 'Municipal',
	capacidad: 593,
	diasLaborados: 227,
	descuentos: 'un (1) día de permiso para actividades de la Escuela Judicial Rodrigo Lara Bonilla (del 19/09/2025 al 19/09/2025)',
	oral: sub(157, 157, 156.3114, 100, 25.5899),
	garantias: sub(46, 46, 45.7982, 46, 45),
	audiencias: audiencias(89, 76, 13, 0, 5),
	oralMasAudiencias: 30.5899,
	total: 37.795,
});
const familia = despacho({
	nombre: 'JUZGADO 001 DE FAMILIA DE CHIQUINQUIRA',
	especialidad: 'Familia',
	categoria: 'Circuito',
	capacidad: 830,
	diasLaborables: 135,
	diasLaborados: 134,
	conEscritos: true,
	oral: sub(297, 220, 174.5526, 112, 25.6656),
	escrito: sub(167, 130, 98.1491, 134, 45),
	audiencias: audiencias(133, 111, 15, 7, 5),
	oralMasAudiencias: 30.6656,
	total: 37.8328,
});
const garagoa = despacho({
	nombre: 'JUZGADO 001 PROMISCUO DE FAMILIA DEL CIRCUITO DE GARAGOA',
	especialidad: 'FamiliaPromiscuo',
	categoria: 'Circuito',
	capacidad: 454,
	diasLaborables: 93,
	diasLaborados: 93,
	oral: sub(213, 131, 86.8816, 51, 23.4802),
	audiencias: audiencias(23, 10, 12, 1, 5),
	oralMasAudiencias: 28.4802,
	total: 28.4802,
});
const sinDias = despacho({
	nombre: 'JUZGADO 003 CIVIL MUNICIPAL DE TUNJA',
	especialidad: 'Civil',
	categoria: 'Municipal',
	diasLaborables: 0,
	diasLaborados: 0,
	oral: sub(528, 0, 0, 0, 0),
});
const garantias = despacho({
	nombre: 'JUZGADO 003 PENAL MUNICIPAL CON FUNCION DE CONTROL DE GARANTIAS DE TUNJA',
	especialidad: 'PenalGarantias',
	categoria: 'Municipal',
	esGarantias: true,
	capacidad: 730,
	diasHabilesDespacho: 241,
	diasLaborables: 213,
	diasLaborados: 195,
	oral: sub(224, 171, 181.2448, 171, 45),
	garantias: sub(353, 275, 285.6224, 275, 45),
	audiencias: audiencias(336, 275, 59, 2, 0),
	oralMasAudiencias: 45,
	total: 45,
});
const penalCircuito = despacho({
	nombre: 'JUZGADO 004 PENAL DEL CIRCUITO CON FUNCION DE CONOCIMIENTO DE TUNJA',
	especialidad: 'Penal',
	categoria: 'Circuito',
	capacidad: 523,
	diasLaborables: 17,
	diasLaborados: 17,
	oral: sub(483, 269, 36.0132, 25, 27.7676),
	audiencias: audiencias(28, 28, 0, 0, 5),
	oralMasAudiencias: 32.7676,
	total: 32.7676,
});
const ejecucion = despacho({
	nombre: 'JUZGADO 005 DE EJECUCION DE PENAS Y MEDIDAS DE SEGURIDAD DE TUNJA',
	especialidad: 'EjecucionPenas',
	categoria: 'Circuito',
	capacidad: 4336,
	diasHabilesDespacho: 244,
	diasLaborables: 7,
	diasLaborados: 7,
	conEscritos: true,
	escrito: sub(1699, 91, 48.7418, 51, 45),
	total: 45,
});

const texto = (despachos: DespachoEficiencia[], ponderada: number, genero: 'femenino' | 'masculino' = 'femenino', elegidas = []) =>
	motivacionEficienciaDespacho1({ genero, despachos, ponderada, elegidas }).join('\n');

describe('especialidad sugerida según los datos', () => {
	it('elige el formato de cada uno de los seis', () => {
		expect(plantillaSugerida(ejecucion)).toBe('ejecucionPenas');
		expect(plantillaSugerida(garantias)).toBe('garantias');
		expect(plantillaSugerida(civil)).toBe('oral');
		expect(plantillaSugerida(familia)).toBe('oralEscrito');
		expect(plantillaSugerida(motavita)).toBe('promiscuoOral');
		expect(plantillaSugerida(ventaquemada)).toBe('promiscuoOralEscrito');
	});

	it('la elegida manda si es válida; si no, la sugerida', () => {
		expect(plantillaDe(ventaquemada, [{ despachoId: ventaquemada.despachoId!, plantilla: 'oralEscrito' }])).toBe('oralEscrito');
		expect(plantillaDe(ventaquemada, [{ despachoId: ventaquemada.despachoId!, plantilla: 'constructor' }])).toBe('promiscuoOralEscrito');
		expect(plantillaDe(ventaquemada, [{ despachoId: 'otro', plantilla: 'oral' }])).toBe('promiscuoOralEscrito');
	});
});

describe('eficiencia con la redacción del despacho 1', () => {
	it('oral no promiscuo (civil municipal): las cifras del formato', () => {
		const t = texto([civil], 26.9756);
		expect(t).toContain(
			'Días laborables del Despacho: 228 – Días laborables de la funcionaria: 228 – Días laborados por la funcionaria: 228.'
		);
		expect(t).toContain('Capacidad máxima de respuesta: 1359 - Capacidad Máxima proporcional: NA.');
		expect(t).toContain('Respuesta efectiva demanda de justicia: egreso base calificación: 406 / Carga proporcional: 739 X 40 = 21,98.');
		expect(t).toContain('(55 + 11 + 0) / 66 X 5 = 5,00.');
		expect(t).toContain('RESPUESTA EFECTIVA A LA DEMANDA DE JUSTICIA Y ATENCIÓN DE AUDIENCIAS PROGRAMADAS: 26,98.');
		expect(t).toMatch(/TOTAL FACTOR EFICIENCIA O RENDIMIENTO: 26,98\.$/);
		expect(t).not.toContain('SISTEMA ORAL');
		expect(t).not.toContain('control de garantías');
	});

	it('promiscuo oral y escrito: tres áreas, artículo 62, y cuatro decimales si con dos no cuadra', () => {
		const t = texto([ventaquemada], 38.5654, 'masculino');
		expect(t).toContain('FACTOR EFICIENCIA O RENDIMIENTO SISTEMA ORAL');
		expect(t).toContain('FACTOR EFICIENCIA O RENDIMIENTO SISTEMA ESCRITURAL – TUTELAS');
		expect(t).toContain('FACTOR EFICIENCIA O RENDIMIENTO CONTROL DE GARANTÍAS');
		expect(t).toContain('PUNTAJE CONSOLIDADO FACTOR EFICIENCIA O RENDIMIENTO');
		expect(t).toContain('ni los del área escritural, las acciones de tutela, los incidentes de desacato y el área de control de garantías');
		expect(t).toContain('egreso control de garantías: 106 audiencias atendidas');
		expect(t).toContain('106 / Carga proporcional: 113 X 45 = 42,21.');
		expect(t).toContain('de los Juzgados Promiscuos Municipales');
		// Con 28,48 + 45,00 + 42,21 el promedio daría 38,56: se muestran las cifras completas.
		expect(t).toContain('promedio de las tres áreas');
		expect(t).toContain('28,4839 + 45,0000 + 42,2124; suman: 115,6963; promedio: 38,57.');
		expect(t).toContain('aplazadas por el funcionario con justificación');
	});

	it('promiscuo oral: títulos propios, días descontados y el tope explicado', () => {
		const t = texto([motavita], 37.795);
		expect(t).toContain('SUBFACTOR RESPUESTA EFECTIVA A LA DEMANDA DE JUSTICIA:');
		expect(t).toContain('SUBFACTOR CONTROL DE GARANTÍAS:');
		expect(t).toContain('PONDERACIÓN');
		expect(t).toContain(
			'Para calcular los días laborados de la funcionaria se descontó un (1) día de permiso para actividades de la Escuela Judicial Rodrigo Lara Bonilla (del 19/09/2025 al 19/09/2025).'
		);
		expect(t).toContain('100 / Carga proporcional: 156,31 X 40 = 25,59.');
		expect(t).toContain('46 / Carga proporcional: 45,80 X 45 = 45,20; como el egreso supera la carga base, el puntaje es de 45,00');
		expect(t).toContain('promedio de las dos áreas');
	});

	it('varios juzgados: un bloque por juzgado con días, sin el de cero días, y la ponderación', () => {
		const t = texto([familia, garagoa, sinDias], 34.0011);
		expect(t).toContain('JUZGADO 001 DE FAMILIA DE CHIQUINQUIRA: Período');
		expect(t).toContain('JUZGADO 001 PROMISCUO DE FAMILIA DEL CIRCUITO DE GARAGOA: Período');
		expect(t).not.toContain('JUZGADO 003 CIVIL MUNICIPAL DE TUNJA');
		expect(t).toContain('134 / Carga proporcional: 98,15 X 45 = 61,44; como el egreso supera la carga base, el puntaje es de 45,00');
		expect(t).toContain('PONDERACIÓN POR DÍAS LABORADOS');
		expect(t).toContain('laboró en dos despachos');
		expect(t).toContain('(37,83 × 134 + 28,48 × 93) / 227 = 34,00.');
		// Familia no tiene control de garantías: no se menciona.
		expect(t).not.toContain('control de garantías');
		expect(t).toMatch(/TOTAL FACTOR EFICIENCIA O RENDIMIENTO: 34,00\.$/);
	});

	it('control de garantías: audiencias y tutelas sobre 45, sin capacidad ni audiencias programadas', () => {
		const t = texto([garantias, penalCircuito], 44.0191, 'masculino');
		expect(t).toContain('- Factor eficiencia o rendimiento para control de garantías: Carga total del despacho: 353 audiencias');
		expect(t).toContain(
			'Factor eficiencia o rendimiento para control de garantías: egreso base calificación: 275 / Carga del funcionario: 275 X 45 = 45,00.'
		);
		expect(t).toContain('171 / Carga del funcionario: 171 X 45 = 45,00.');
		expect(t).toContain('= 90,00. Promedio: 45,00.');
		expect(t).toContain('(45,00 × 195 + 32,77 × 17) / 212 = 44,02.');
		const bloqueGarantias = t.split('JUZGADO 004')[0];
		expect(bloqueGarantias).not.toContain('Capacidad máxima de respuesta');
		expect(bloqueGarantias).not.toContain('Audiencias programadas');
	});

	it('ejecución de penas: actuaciones y tutelas, y el tope', () => {
		const t = texto([ejecucion], 45);
		expect(t).toContain('Carga total del despacho: 1699 actuaciones y tutelas');
		expect(t).toContain('Egreso base para calificación: 51 actuaciones y acciones de tutela.');
		expect(t).toContain('51 / Carga proporcional: 48,74 X 45 = 47,09; como el egreso supera la carga base, el puntaje es de 45,00');
		expect(t).toContain('Días laborados por la funcionaria: 7.');
		expect(t).toContain('Capacidad máxima de respuesta: 4336 - Capacidad Máxima proporcional: NA.');
	});

	it('la especialidad elegida cambia la redacción, no las cifras', () => {
		const elegida = texto([ventaquemada], 38.5654, 'masculino', [
			{ despachoId: ventaquemada.despachoId!, plantilla: 'oralEscrito' },
		] as never);
		expect(elegida).not.toContain('PUNTAJE CONSOLIDADO');
		expect(elegida).toContain('para la evaluación integral de los Juzgados, se toma');
		expect(elegida).toContain('promedio: 38,57.');
	});

	it('la carga proporcional dice con qué carga se calcula (la total del despacho)', () => {
		const t = texto([familia], 37.8328);
		expect(t).toContain('Carga total del despacho: 297 procesos');
		expect(t).toContain('174,55 – (carga total del despacho / días laborables del despacho x días laborados por la funcionaria)');
		expect(t).not.toContain('(carga base de calificación /');
	});

	it('si la carga supera la capacidad máxima, se califica sobre la capacidad proporcional', () => {
		const sobreCapacidad = { ...civil, capacidad: 500, oral: sub(739, 739, 739, 406, 32.48), oralMasAudiencias: 37.48, total: 37.48 };
		const t = texto([sobreCapacidad], 37.48);
		expect(t).toContain('Capacidad máxima de respuesta: 500 - Capacidad Máxima proporcional: 500,00.');
		expect(t).toContain(
			'egreso base calificación: 406 / Capacidad máxima proporcional: 500 X 40 = 32,48; como la carga supera la capacidad máxima'
		);
		expect(t).toContain('literal b del artículo 39');
		const conEgresoMayor = { ...sobreCapacidad, oral: sub(739, 739, 739, 600, 40), oralMasAudiencias: 45, total: 45 };
		expect(texto([conEgresoMayor], 45)).toContain(
			'600 / Capacidad máxima proporcional: 500 X 40 = 48,00; como el egreso supera la capacidad máxima de respuesta, el puntaje es de 40,00, conforme al literal a'
		);
	});

	it('sin audiencias programadas, el subfactor queda en cero y lo dice', () => {
		const t = texto([{ ...civil, audiencias: null, oralMasAudiencias: 21.9756, total: 21.9756 }], 21.9756);
		expect(t).toContain('no se registraron audiencias programadas en el período; el puntaje del subfactor es de 0,00.');
		expect(t).toContain('ATENCIÓN DE AUDIENCIAS PROGRAMADAS: 21,98.');
	});

	it('nada queda sin llenar ni con decimales de más', () => {
		const t = texto([ventaquemada, motavita, familia, garagoa, garantias, penalCircuito, ejecucion, civil], 40);
		expect(t).not.toMatch(/\d[.,]\d{5,}/);
		expect(t).not.toContain('undefined');
		expect(t).not.toContain('NaN');
		expect(t).not.toContain('//');
	});
});
