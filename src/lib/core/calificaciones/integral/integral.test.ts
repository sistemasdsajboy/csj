import { describe, expect, it } from 'vitest';
import { calcularIntegral, categoria, erroresFactores, notaCalidad, puntajeOrganizacion, redondear } from './integral';
import {
	comoTexto,
	mismoTexto,
	motivacionCalidad,
	motivacionesPredeterminadas,
	motivacionOrganizacion,
	motivacionPublicaciones,
	parrafosLibres,
} from './motivacion';
import { motivacionEficiencia, type DespachoEficiencia } from './motivacion-eficiencia';
import { cifra, comoTitulo, enLetras, fechaLarga, letrasYCifra, letrasYCifraDelante, nombreDespacho, palabras } from './redaccion';

const fecha = (s: string) => new Date(`${s}T00:00:00Z`);

describe('redacción', () => {
	it('números en letras como se escriben en los actos', () => {
		expect(enLetras(3)).toBe('tres');
		expect(enLetras(13)).toBe('trece');
		expect(enLetras(21)).toBe('veintiuno');
		expect(enLetras(45)).toBe('cuarenta y cinco');
		expect(enLetras(100)).toBe('cien');
		expect(enLetras(512)).toBe('quinientos doce');
		expect(enLetras(2026)).toBe('dos mil veintiséis');
		expect(enLetras(21000)).toBe('veintiún mil');
		expect(letrasYCifra(13)).toBe('trece (13)');
		expect(letrasYCifraDelante(1)).toBe('un (1)');
		expect(letrasYCifraDelante(21)).toBe('veintiún (21)');
		expect(letrasYCifraDelante(31)).toBe('treinta y un (31)');
		expect(letrasYCifraDelante(6)).toBe('seis (6)');
	});

	it('cifras con coma decimal', () => {
		expect(cifra(704.6052631578947)).toBe('704,61');
		expect(cifra(16.35010224948875)).toBe('16,35');
		expect(cifra(5)).toBe('5,00');
	});

	it('nombres de despacho en forma de título', () => {
		expect(comoTitulo('JUZGADO 001 ADMINISTRATIVO DE SOGAMOSO')).toBe('Juzgado 001 Administrativo de Sogamoso');
		// En la motivación, el número del juzgado se escribe como en ARGUMENTOS.
		expect(nombreDespacho('JUZGADO 001 CIVIL MUNICIPAL DE TUNJA')).toBe('Juzgado Primero Civil Municipal de Tunja');
		expect(nombreDespacho('JUZGADO 003 PENAL MUNICIPAL MIXTO DE CHIQUINQUIRA')).toBe(
			'Juzgado Tercero Penal Municipal Mixto de Chiquinquira'
		);
		expect(nombreDespacho('JUZGADO 010 ADMINISTRATIVO DE TUNJA')).toBe('Juzgado Décimo Administrativo de Tunja');
		expect(nombreDespacho('JUZGADO 011 ADMINISTRATIVO DE TUNJA')).toBe('Juzgado Once Administrativo de Tunja');
		expect(nombreDespacho('TRIBUNAL ADMINISTRATIVO DE BOYACA')).toBe('Tribunal Administrativo de Boyaca');
		expect(comoTitulo('JUZGADO 001 PROMISCUO DE FAMILIA DEL CIRCUITO DE SANTA ROSA DE VITERBO')).toBe(
			'Juzgado 001 Promiscuo de Familia del Circuito de Santa Rosa de Viterbo'
		);
	});

	it('fechas sin correr el día por la zona horaria', () => {
		expect(fechaLarga(fecha('2026-07-24'))).toBe('24 de julio de 2026');
	});

	it('palabras según el género; sin género, la forma doble del formato oficial', () => {
		expect(palabras('femenino')).toMatchObject({ del: 'de la', funcionario: 'funcionaria', senor: 'señora' });
		expect(palabras('masculino')).toMatchObject({ del: 'del', funcionario: 'funcionario', senor: 'señor' });
		expect(palabras(null)).toMatchObject({ funcionario: 'funcionario (a)', doctor: 'doctor (a)' });
	});
});

describe('calificación integral', () => {
	it('factor calidad = suma / formularios (art. 31): el ejemplo de 13 formularios y 512 puntos da 39,38', () => {
		expect(cifra(notaCalidad(13, 512)!)).toBe('39,38');
		expect(notaCalidad(0, 512)).toBeNull();
	});

	it('el texto de organización fija el puntaje', () => {
		expect(puntajeOrganizacion('completo', null)).toBe(12);
		expect(puntajeOrganizacion('sinArl', null)).toBe(11);
		expect(puntajeOrganizacion('sinEscuela', null)).toBe(10);
		expect(puntajeOrganizacion('sinAmbos', null)).toBe(9);
		expect(puntajeOrganizacion('otro', 8.5)).toBe(8.5);
		expect(puntajeOrganizacion('desconocido', 12)).toBeNull();
	});

	it('el ejemplo de la plantilla: 39,38 + 35,94 + 11 + 0 = 86, excelente', () => {
		const r = calcularIntegral({ calidad: 512 / 13, eficiencia: 35.938, organizacion: 11, publicaciones: 0 });
		expect(r).toMatchObject({ completa: true, entero: 86, categoria: 'EXCELENTE' });
	});

	it('se aproxima solo el resultado final, y de ,50 en adelante se sube', () => {
		expect(redondear(84.5)).toBe(85);
		expect(redondear(84.49)).toBe(84);
		expect(redondear(84.499)).toBe(84);
		// 84,5 calculado con ruido de punto flotante sigue subiendo.
		expect(redondear(39.38 + 35.12 + 10)).toBe(85);
		expect(redondear(59.5)).toBe(60);
	});

	it('categorías del art. 23', () => {
		expect(categoria(85)).toBe('EXCELENTE');
		expect(categoria(84)).toBe('BUENA');
		expect(categoria(60)).toBe('BUENA');
		expect(categoria(59)).toBe('INSATISFACTORIA');
	});

	it('si falta un factor, dice cuál', () => {
		expect(calcularIntegral({ calidad: null, eficiencia: 30, organizacion: 12, publicaciones: null })).toEqual({
			completa: false,
			faltan: ['calidad', 'publicaciones'],
		});
	});

	it('rechaza factores fuera de rango', () => {
		expect(erroresFactores({ calidad: 43, eficiencia: 30, organizacion: 13, publicaciones: 2 })).toHaveLength(3);
		expect(erroresFactores({ calidad: 42, eficiencia: 45, organizacion: 12, publicaciones: 1 })).toHaveLength(0);
	});
});

describe('motivación de calidad, organización y publicaciones', () => {
	it('calidad, con la redacción de la plantilla y el género', () => {
		const [t] = motivacionCalidad({ genero: 'femenino', formularios: 13, suma: 512 });
		expect(t).toBe(
			'La motivación de la calificación del factor calidad de la funcionaria se encuentra en los trece (13) formularios ' +
				'diligenciados por el superior funcional, los cuales hacen parte integrante de este acto administrativo. El resultado ' +
				'de 39,38 puntos se obtuvo de dividir la sumatoria de los puntajes de los formularios remitidos a este Consejo ' +
				'Seccional (512,00) entre el número de formularios, conforme al artículo 31 del Acuerdo PSAA16-10618 de 2016.'
		);
	});

	it('organización: párrafo general con la fecha de la visita y el texto elegido', () => {
		const t = motivacionOrganizacion({ genero: 'femenino', fechaVisita: fecha('2026-07-24'), opcion: 'sinArl', periodo: 2025 });
		expect(t).toHaveLength(2);
		expect(t[0]).toContain('visita practicada el 24 de julio de 2026');
		expect(t[0]).toContain('la señora Juez cumple');
		expect(t[1]).toContain('la funcionaria no participó en actividades de formación');
		expect(t[1]).toContain('haber sido invitada');
		expect(t[1]).toMatch(/calificación en este factor de 11 puntos\.$/);
	});

	it('organización: el oficio de la Escuela Judicial y el año salen de los datos', () => {
		const t = motivacionOrganizacion({
			genero: 'masculino',
			fechaVisita: fecha('2026-07-24'),
			opcion: 'sinEscuela',
			periodo: 2025,
			oficioEscuela: 'EJO26-73 del 21 de enero de 2026',
		});
		expect(t[1]).toContain(
			'el funcionario no participó en los programas de formación de la Escuela Judicial «Rodrigo Lara Bonilla» de 2025, según el oficio EJO26-73 del 21 de enero de 2026'
		);
		expect(t[1]).toMatch(/10 puntos\.$/);
	});

	it('organización: el texto 4 descuenta 3 puntos y queda en 9', () => {
		const t = motivacionOrganizacion({
			genero: 'masculino',
			fechaVisita: fecha('2026-07-24'),
			opcion: 'sinAmbos',
			periodo: 2025,
			oficioEscuela: 'X',
		});
		expect(t[1]).toMatch(/9 puntos\.$/);
	});

	it('organización "otro": solo el párrafo general; el resto lo escribe quien califica', () => {
		const t = motivacionOrganizacion({ genero: null, fechaVisita: fecha('2026-07-24'), opcion: 'otro', periodo: 2025 });
		expect(t).toHaveLength(1);
		expect(t[0]).toContain('visita practicada el 24 de julio de 2026');
	});

	it('publicaciones: 0 puntos con el texto fijo; con 1 punto no hay texto predeterminado', () => {
		expect(motivacionPublicaciones({ genero: 'femenino', puntaje: 0 })).toEqual([
			'La funcionaria no presentó publicaciones para la evaluación de este factor.',
		]);
		expect(motivacionPublicaciones({ genero: 'masculino', puntaje: 0 })).toEqual([
			'El funcionario no presentó publicaciones para la evaluación de este factor.',
		]);
		expect(motivacionPublicaciones({ genero: null, puntaje: 1 })).toEqual([]);
	});

	it('textos predeterminados de los factores que se pueden modificar; null si faltan datos', () => {
		const pre = motivacionesPredeterminadas({
			genero: 'femenino',
			periodo: 2025,
			calidadFormularios: 13,
			calidadSuma: 512,
			organizacionFechaVisita: fecha('2026-07-24'),
			organizacionOpcion: 'completo',
			publicacionesPuntaje: 0,
		});
		expect(pre.calidad?.[0]).toContain('El resultado de 39,38 puntos');
		expect(pre.organizacion).toHaveLength(2);
		expect(pre.publicaciones?.[0]).toMatch(/^La funcionaria no presentó/);
		expect(motivacionesPredeterminadas({ genero: null, periodo: 2025 })).toEqual({
			calidad: null,
			organizacion: null,
			publicaciones: null,
		});
		// Una opción desconocida no rompe: simplemente no hay texto.
		expect(
			motivacionesPredeterminadas({ genero: null, periodo: 2025, organizacionFechaVisita: fecha('2026-07-24'), organizacionOpcion: 'x' })
				.organizacion
		).toBeNull();
	});

	it('mismo texto: no cuentan los espacios ni los saltos de línea de más', () => {
		expect(mismoTexto('Uno.\n\nDos.', '  Uno.\n \n\nDos.\n')).toBe(true);
		expect(mismoTexto('Uno\nsigue.', 'Uno sigue.')).toBe(true);
		expect(mismoTexto('Uno.', 'Uno')).toBe(false);
		expect(comoTexto(['A', 'B'])).toBe('A\n\nB');
		expect(comoTexto(null)).toBe('');
	});

	it('motivación libre: un párrafo por bloque', () => {
		expect(parrafosLibres('Uno\nsigue uno.\n\nDos.\n\n\n')).toEqual(['Uno sigue uno.', 'Dos.']);
	});
});

const sinDatos = { cargaDespacho: 0, cargaFuncionario: 0, cargaProporcional: 0, egreso: 0, total: 0, desglose: null };
const despacho = (over: Partial<DespachoEficiencia>): DespachoEficiencia => ({
	nombre: 'JUZGADO 001 PROMISCUO DE FAMILIA DE SANTA ROSA DE VITERBO',
	desde: fecha('2025-01-01'),
	hasta: fecha('2025-12-31'),
	diasHabilesDespacho: 228,
	diasLaborables: 228,
	diasLaborados: 228,
	descuentos: null,
	cargaEfectivaTotal: 230,
	egresoEfectivoTotal: 153,
	capacidad: 454,
	conEscritos: false,
	oral: sinDatos,
	escrito: sinDatos,
	garantias: sinDatos,
	audiencias: null,
	oralMasAudiencias: 0,
	total: 0,
	...over,
});

describe('motivación de eficiencia', () => {
	it('el ejemplo de la plantilla (sin escrito): carga proporcional, no supera la capacidad', () => {
		const prop = (204 * 222) / 228;
		const total = (161 / prop) * 40;
		const t = motivacionEficiencia({
			genero: 'masculino',
			ponderada: total + 5,
			despachos: [
				despacho({
					diasLaborados: 222,
					descuentos: 'seis (6) días de capacitaciones certificados por la Escuela Judicial Rodrigo Lara Bonilla mediante oficio EJO26-73',
					oral: {
						cargaDespacho: 204,
						cargaFuncionario: 204,
						cargaProporcional: prop,
						egreso: 161,
						total,
						desglose: { principal: 61, tutelas: 92, conciliaciones: 8 },
					},
					audiencias: { programadas: 52, atendidas: 50, ajenas: 2, justificadas: 0, noJustificadas: 0, puntaje: 5 },
					oralMasAudiencias: total + 5,
					total: total + 5,
				}),
			],
		}).join('\n');
		expect(t).toContain('Juzgado Primero Promiscuo de Familia de Santa Rosa de Viterbo del 01/01/2025 al 31/12/2025');
		expect(t).toContain(
			'Días laborables del Despacho: 228 – Días laborables del Funcionario: 228 - Días laborados por el funcionario: 222.'
		);
		expect(t).toContain('Para calcular los días laborados por el funcionario se descontaron seis (6) días de capacitaciones');
		expect(t).toContain(
			'Carga efectiva total del despacho: 230 procesos. Egreso efectivo total del despacho: 153 procesos. Capacidad máxima de respuesta: 454 procesos.'
		);
		expect(t).toContain(
			'la carga base para la calificación corresponde a la carga proporcional al tiempo laborado por el funcionario, esto es: 198,63 procesos'
		);
		expect(t).toContain(
			'que corresponden a 61 egresos del sistema oral y 92 de acciones de tutela e incidentes de desacato registrados por el funcionario más 8 conciliaciones que se contabilizan doble'
		);
		expect(t).toContain(
			'Como la carga no supera la capacidad máxima de respuesta (454 procesos), se aplica la fórmula del artículo 39 del Acuerdo:'
		);
		expect(t).toContain('(161 / 198,63) × 40 = 32,42');
		expect(t).toContain('((50 + 2) / 52) × 5 = 5,00');
		expect(t).toContain('32,42 + 5,00 = 37,42');
		expect(t).toMatch(/TOTAL FACTOR EFICIENCIA O RENDIMIENTO: 37,42 puntos$/);
	});

	it('un solo día descontado: "se descontó un (1) día"; varios: "se descontaron"', () => {
		const con = (descuentos: string) =>
			motivacionEficiencia({ genero: 'femenino', ponderada: 0, despachos: [despacho({ descuentos })] }).join('\n');
		expect(con('un (1) día de incapacidad (del 17/10/2025 al 19/10/2025)')).toContain(
			'por la funcionaria se descontó un (1) día de incapacidad'
		);
		expect(
			con('un (1) día de incapacidad (del 17/10/2025 al 19/10/2025) y un (1) día de escrutinios (del 15/07/2025 al 15/07/2025)')
		).toContain('se descontaron un (1) día de incapacidad');
		expect(con('dos (2) días de incapacidad (del 03/03/2025 al 04/03/2025)')).toContain('se descontaron dos (2) días');
	});

	it('la carga supera la capacidad máxima proporcional (variante nueva)', () => {
		const total = (263 / ((652 * 225) / 228)) * 40;
		const t = motivacionEficiencia({
			genero: 'femenino',
			ponderada: total + 5,
			despachos: [
				despacho({
					nombre: 'JUZGADO 001 ADMINISTRATIVO DE PRUEBA',
					diasLaborados: 225,
					cargaEfectivaTotal: 754,
					egresoEfectivoTotal: 263,
					capacidad: 652,
					oral: {
						cargaDespacho: 714,
						cargaFuncionario: 714,
						cargaProporcional: (714 * 225) / 228,
						egreso: 263,
						total,
						desglose: { principal: 84, tutelas: 179, conciliaciones: 0 },
					},
					audiencias: { programadas: 41, atendidas: 41, ajenas: 0, justificadas: 0, noJustificadas: 0, puntaje: 5 },
					oralMasAudiencias: total + 5,
					total: total + 5,
				}),
			],
		}).join('\n');
		expect(t).toContain('Capacidad Máxima de respuesta proporcional al tiempo laborado: 643,42 procesos.');
		expect(t).toContain(
			'la carga proporcional al tiempo laborado por la funcionaria es de 704,61 procesos y supera la capacidad máxima de respuesta proporcional al tiempo laborado, que es de 643,42 procesos'
		);
		expect(t).toContain(
			'que corresponden a 84 egresos del sistema oral y 179 de acciones de tutela e incidentes de desacato registrados por la funcionaria.'
		);
		expect(t).not.toContain('conciliaci');
		expect(t).toContain('se aplica la fórmula del literal b del artículo 39 del Acuerdo, en concordancia con su artículo 45:');
		expect(t).toContain('(263 / 643,42) × 40 = 16,35');
		expect(t).toContain('16,35 + 5,00 = 21,35');
		expect(t).toMatch(/21,35 puntos$/);
	});

	it('el ejemplo con escrito de ARGUMENTOS: oral y escritural se promedian', () => {
		const oral = (204 / 373) * 40;
		const total = (oral + 5 + 45) / 2;
		const t = motivacionEficiencia({
			genero: 'femenino',
			ponderada: total,
			despachos: [
				despacho({
					nombre: 'JUZGADO 001 CIVIL MUNICIPAL DE PRUEBA',
					cargaEfectivaTotal: 624,
					egresoEfectivoTotal: 398,
					capacidad: 1359,
					conEscritos: true,
					oral: {
						cargaDespacho: 373,
						cargaFuncionario: 373,
						cargaProporcional: 373,
						egreso: 204,
						total: oral,
						desglose: { principal: 203, tutelas: 0, conciliaciones: 1 },
					},
					escrito: {
						cargaDespacho: 195,
						cargaFuncionario: 195,
						cargaProporcional: 195,
						egreso: 195,
						total: 45,
						desglose: { principal: 2, tutelas: 193, conciliaciones: 0 },
					},
					audiencias: { programadas: 86, atendidas: 51, ajenas: 28, justificadas: 7, noJustificadas: 0, puntaje: 5 },
					oralMasAudiencias: oral + 5,
					total,
				}),
			],
		}).join('\n');
		expect(t).toContain('que corresponden a 203 egresos del sistema oral más 1 conciliación que se contabiliza doble');
		expect(t).toContain('(204 / 373,00) × 40 = 21,88');
		expect(t).toContain('((51 + 28 + 7) / 86) × 5 = 5,00');
		expect(t).toContain('B. Factor Eficiencia o Rendimiento Sistema Escritural – Tutelas');
		expect(t).toContain(
			'que corresponden a 2 egresos del sistema escrito y 193 de acciones de tutela e incidentes de desacato registrados por la funcionaria'
		);
		expect(t).toContain('(195 / 195,00) × 45 = 45,00');
		// Como en ARGUMENTOS: el oral cierra con su total propio antes del escritural.
		expect(t).toContain(
			'= 26,88.\nTOTAL FACTOR EFICIENCIA O RENDIMIENTO SISTEMA ORAL: 26,88 puntos\nB. Factor Eficiencia o Rendimiento Sistema Escritural – Tutelas'
		);
		expect(t).toContain('Total factor eficiencia o rendimiento oral / sistema escritural: = 26,88 + 45,00 = 71,88 / 2 = 35,94');
		expect(t).toMatch(/35,94 puntos$/);
	});

	it('la carga del funcionario es menor que la proporcional (variante nueva)', () => {
		const t = motivacionEficiencia({
			genero: 'masculino',
			ponderada: 30,
			despachos: [
				despacho({
					oral: { cargaDespacho: 400, cargaFuncionario: 150, cargaProporcional: 300, egreso: 100, total: (100 / 150) * 40, desglose: null },
					total: 30,
				}),
			],
		}).join('\n');
		expect(t).toContain(
			'corresponde a la carga base para la calificación del funcionario, por ser inferior a la carga proporcional al tiempo laborado (300,00 procesos), esto es: 150 procesos'
		);
		expect(t).toContain('(100 / 150) × 40 = 26,67');
	});

	it('el egreso supera la carga base: el subfactor queda en el tope de 40 (variante nueva)', () => {
		const t = motivacionEficiencia({
			genero: 'masculino',
			ponderada: 45,
			despachos: [
				despacho({
					oral: { cargaDespacho: 100, cargaFuncionario: 100, cargaProporcional: 100, egreso: 120, total: 40, desglose: null },
					total: 45,
				}),
			],
		}).join('\n');
		expect(t).toContain(
			'(120 / 100,00) × 40 = 48,00; como el egreso supera la carga base, el puntaje del subfactor es de 40,00 puntos, conforme al parágrafo 2.º del artículo 39 del Acuerdo.'
		);
	});

	it('varios despachos: un bloque por despacho y la ponderación por días', () => {
		const a = despacho({
			nombre: 'JUZGADO 001 CIVIL MUNICIPAL DE TUNJA',
			diasLaborados: 100,
			oral: { cargaDespacho: 100, cargaFuncionario: 100, cargaProporcional: 50, egreso: 25, total: 20, desglose: null },
			total: 20,
		});
		const b = despacho({
			nombre: 'JUZGADO 002 CIVIL MUNICIPAL DE TUNJA',
			diasLaborados: 50,
			oral: { cargaDespacho: 100, cargaFuncionario: 100, cargaProporcional: 25, egreso: 25, total: 40, desglose: null },
			total: 40,
		});
		const t = motivacionEficiencia({ genero: 'masculino', ponderada: (20 * 100 + 40 * 50) / 150, despachos: [a, b] }).join('\n');
		expect(t).toContain('Juzgado Primero Civil Municipal de Tunja del');
		expect(t).toContain('Juzgado Segundo Civil Municipal de Tunja del');
		expect(t).toContain('según los días laborados en cada despacho: (20,00 × 100 + 40,00 × 50) / 150 = 26,67');
	});

	it('sin audiencias programadas lo dice y suma cero', () => {
		const t = motivacionEficiencia({
			genero: 'masculino',
			ponderada: 20,
			despachos: [
				despacho({
					oral: { cargaDespacho: 100, cargaFuncionario: 100, cargaProporcional: 100, egreso: 50, total: 20, desglose: null },
					oralMasAudiencias: 20,
					total: 20,
				}),
			],
		}).join('\n');
		expect(t).toContain('no se registraron audiencias programadas en el período');
		expect(t).toContain('20,00 + 0,00 = 20,00');
	});
});
