import type { CalificacionIntegral } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { descuentosPorJuzgado, revisarCompletitud, seccionesMotivacion, type EntradaDocumento } from './documento';
import { comoTexto, motivacionCalidad } from './motivacion';
import { fraseDeDescuentos, type DescuentoNovedad, type DespachoEficiencia } from './motivacion-eficiencia';

const fecha = (s: string) => new Date(`${s}T00:00:00Z`);

const integral: CalificacionIntegral = {
	fechaSala: fecha('2026-11-13'),
	cargoCarrera: { cargo: 'Juez Civil', municipio: 'Tunja', distrito: 'Tunja' },
	provisionalidad: [],
	calidadFormularios: 13,
	calidadSuma: 512,
	organizacionFechaVisita: fecha('2026-07-24'),
	organizacionOpcion: 'completo',
	organizacionPuntaje: null,
	oficioEscuela: null,
	publicacionesPuntaje: 0,
	calidadMotivacion: null,
	organizacionMotivacion: null,
	publicacionesMotivacion: null,
	descuentosEditados: [],
	motivacionLibre: null,
	ponente: null,
	presidente: null,
	iniciales: null,
};

const entrada = (i: Partial<CalificacionIntegral> = {}): EntradaDocumento => ({
	periodo: 2025,
	funcionario: { nombres: 'Nombre', apellidos: 'Apellido', cedula: '1', genero: 'femenino' },
	eficiencia: { despachos: [], ponderada: 30 },
	integral: { ...integral, ...i },
	textosPredeterminados: true,
});

const parrafos = (e: EntradaDocumento, n: number) => seccionesMotivacion(e)[n].parrafos;
const calidadPredeterminada = comoTexto(motivacionCalidad({ genero: 'femenino', formularios: 13, suma: 512 }));

describe('motivación modificada a mano', () => {
	it('sin modificar sale el texto predeterminado', () => {
		expect(parrafos(entrada(), 0)[0]).toContain('El resultado de 39,38 puntos');
	});

	it('el texto modificado reemplaza al predeterminado, con sus párrafos', () => {
		const e = entrada({ calidadMotivacion: { texto: 'Texto propio.\n\nSegundo párrafo.', base: calidadPredeterminada } });
		expect(parrafos(e, 0)).toEqual(['Texto propio.', 'Segundo párrafo.']);
		// Los datos no cambiaron desde que se modificó: no hay aviso.
		expect(revisarCompletitud(e).join(' ')).not.toContain('se modificó a mano');
	});

	it('si los datos cambian después de modificar el texto, lo avisa', () => {
		const e = entrada({
			calidadFormularios: 14,
			calidadMotivacion: { texto: 'Texto con 39,38 puntos.', base: calidadPredeterminada },
		});
		expect(revisarCompletitud(e)).toContain(
			'El texto de calidad se modificó a mano y después cambiaron sus datos: revise que siga diciendo lo correcto.'
		);
	});

	it('cambiar el género también cambia el predeterminado y avisa', () => {
		const e = entrada({ calidadMotivacion: { texto: 'Propio.', base: calidadPredeterminada } });
		e.funcionario.genero = 'masculino';
		expect(revisarCompletitud(e).join(' ')).toContain('El texto de calidad se modificó a mano');
	});

	it('organización "otro" sin texto propio: párrafo general y pendiente la motivación del puntaje', () => {
		const e = entrada({ organizacionOpcion: 'otro', organizacionPuntaje: 10 });
		const t = parrafos(e, 1);
		expect(t).toHaveLength(2);
		expect(t[1]).toMatch(/^\[Pendiente: escribir la motivación del puntaje/);
		expect(revisarCompletitud(e).join(' ')).toContain('Eligió "Otro"');
	});

	it('organización "otro" con texto propio: sale lo escrito, sin pendiente', () => {
		const e = entrada({
			organizacionOpcion: 'otro',
			organizacionPuntaje: 10,
			organizacionMotivacion: { texto: 'Párrafo general.\n\nMotivación del descuento.', base: 'Párrafo general.' },
		});
		expect(parrafos(e, 1)).toEqual(['Párrafo general.', 'Motivación del descuento.']);
		expect(revisarCompletitud(e).join(' ')).not.toContain('Eligió "Otro"');
	});

	it('publicaciones con 1 punto: sin texto queda pendiente; con texto sale lo escrito', () => {
		expect(parrafos(entrada({ publicacionesPuntaje: 1 }), 3)).toEqual(['[Pendiente: digitar el texto de la publicación.]']);
		expect(revisarCompletitud(entrada({ publicacionesPuntaje: 1 }))).toContain(
			'Puntaje 1 en publicaciones: falta el texto de la publicación.'
		);
		const e = entrada({ publicacionesPuntaje: 1, publicacionesMotivacion: { texto: 'Libro X.', base: '' } });
		expect(parrafos(e, 3)).toEqual(['Libro X.']);
		expect(revisarCompletitud(e).join(' ')).not.toContain('publicaciones');
	});

	it('la eficiencia no se puede reemplazar: siempre la arma el sistema', () => {
		expect(seccionesMotivacion(entrada())[2].titulo).toBe('3. FACTOR EFICIENCIA O RENDIMIENTO');
	});
});

describe('redacción de los días descontados', () => {
	// Dos novedades con días descontados, como las arma el sistema.
	const ID1 = '6a0000000000000000000001';
	const ID2 = '6a0000000000000000000002';
	const detalle: DescuentoNovedad[] = [
		{
			novedadId: ID1,
			dias: 6,
			descripcion: 'permiso para actividades de la Escuela Judicial Rodrigo Lara Bonilla (del 02/06/2025 al 09/06/2025)',
		},
		{ novedadId: ID2, dias: 1, descripcion: 'incapacidad (del 17/10/2025 al 17/10/2025)' },
	];
	const auto = fraseDeDescuentos(detalle)!;
	const despacho = (descuentos: string | null, descuentosDetalle: DescuentoNovedad[] = descuentos ? detalle : []): DespachoEficiencia => ({
		nombre: 'JUZGADO 001 CIVIL MUNICIPAL DE PRUEBA',
		desde: fecha('2025-01-01'),
		hasta: fecha('2025-12-31'),
		diasHabilesDespacho: 228,
		diasLaborables: 228,
		diasLaborados: 222,
		descuentos,
		descuentosDetalle,
		cargaEfectivaTotal: 100,
		egresoEfectivoTotal: 80,
		capacidad: 500,
		conEscritos: false,
		oral: { cargaDespacho: 100, cargaFuncionario: 100, cargaProporcional: 97.37, egreso: 80, total: 32.86, desglose: null },
		escrito: null,
		garantias: null,
		audiencias: null,
		oralMasAudiencias: 32.86,
		total: 32.86,
	});
	const con = (descuentos: string | null, i: Partial<CalificacionIntegral> = {}, despachos = [despacho(descuentos)]) => ({
		...entrada(i),
		eficiencia: { despachos, ponderada: 32.86 },
	});
	const eficiencia = (e: EntradaDocumento) => seccionesMotivacion(e)[2].parrafos.join('\n');

	it('sin modificar sale la frase que arma el sistema con las novedades', () => {
		expect(auto).toBe(
			'seis (6) días de permiso para actividades de la Escuela Judicial Rodrigo Lara Bonilla (del 02/06/2025 al 09/06/2025) y un (1) día de incapacidad (del 17/10/2025 al 17/10/2025)'
		);
		expect(eficiencia(con(auto))).toContain(`por la funcionaria se descontaron ${auto}.`);
	});

	it('cada novedad se modifica por separado; los días no cambian', () => {
		const texto = 'capacitaciones certificados por la Escuela Judicial Rodrigo Lara Bonilla mediante oficio EJO26-73';
		const e = con(auto, { descuentosEditados: [{ novedadId: ID1, texto, base: detalle[0].descripcion }] });
		expect(eficiencia(e)).toContain(`se descontaron seis (6) días de ${texto} y un (1) día de incapacidad (del 17/10/2025 al 17/10/2025).`);
		expect(eficiencia(e)).toContain('Días laborados por la funcionaria: 222.');
		expect(revisarCompletitud(e).join(' ')).not.toContain('días descontados');
	});

	it('si cambia la novedad después de modificar su descripción, lo avisa', () => {
		const e = con(auto, {
			descuentosEditados: [{ novedadId: ID2, texto: 'Texto propio', base: 'incapacidad (del 01/03/2025 al 01/03/2025)' }],
		});
		expect(revisarCompletitud(e)).toContain(
			'La redacción de los días descontados se modificó a mano y después cambiaron las novedades: revise que siga diciendo lo correcto.'
		);
	});

	it('una descripción de una novedad que ya no existe no sale', () => {
		const e = con(auto, { descuentosEditados: [{ novedadId: '6a0000000000000000000009', texto: 'Texto propio', base: 'x' }] });
		expect(eficiencia(e)).not.toContain('Texto propio');
		expect(revisarCompletitud(e).join(' ')).not.toContain('días descontados');
	});

	it('sin días descontados no se aplica', () => {
		const editado = { descuentosEditados: [{ novedadId: ID1, texto: 'Texto propio', base: detalle[0].descripcion }] };
		expect(eficiencia(con(null, editado))).not.toContain('Texto propio');
	});

	describe('funcionario que trabajó en dos juzgados', () => {
		const ID3 = '6a0000000000000000000003';
		const delSegundo: DescuentoNovedad[] = [{ novedadId: ID3, dias: 3, descripcion: 'licencia (del 03/09/2025 al 05/09/2025)' }];
		const segundo: DespachoEficiencia = {
			...despacho(fraseDeDescuentos(delSegundo), delSegundo),
			nombre: 'JUZGADO 002 PENAL MUNICIPAL DE PRUEBA',
		};
		const dos = (i: Partial<CalificacionIntegral> = {}) => con(auto, i, [despacho(auto), segundo]);

		it('cada juzgado tiene sus propias novedades', () => {
			expect(descuentosPorJuzgado(dos())).toEqual([
				{ juzgado: 'JUZGADO 001 CIVIL MUNICIPAL DE PRUEBA', descuentos: detalle },
				{ juzgado: 'JUZGADO 002 PENAL MUNICIPAL DE PRUEBA', descuentos: delSegundo },
			]);
		});

		it('lo modificado en un juzgado cambia solo la frase de ese juzgado', () => {
			const e = dos({ descuentosEditados: [{ novedadId: ID3, texto: 'licencia no remunerada', base: delSegundo[0].descripcion }] });
			const texto = eficiencia(e);
			expect(texto).toContain('se descontaron tres (3) días de licencia no remunerada.');
			// El primer juzgado conserva la frase que arma el sistema.
			expect(texto).toContain(`se descontaron ${auto}.`);
		});

		it('se pueden modificar novedades de los dos juzgados a la vez', () => {
			const e = dos({
				descuentosEditados: [
					{ novedadId: ID2, texto: 'incapacidad médica', base: detalle[1].descripcion },
					{ novedadId: ID3, texto: 'licencia no remunerada', base: delSegundo[0].descripcion },
				],
			});
			const texto = eficiencia(e);
			expect(texto).toContain('y un (1) día de incapacidad médica.');
			expect(texto).toContain('se descontaron tres (3) días de licencia no remunerada.');
		});

		it('si cambia la novedad de un juzgado después de modificarla, lo avisa', () => {
			const e = dos({ descuentosEditados: [{ novedadId: ID3, texto: 'Texto propio', base: 'licencia (del 01/02/2025 al 03/02/2025)' }] });
			expect(revisarCompletitud(e).join(' ')).toContain('La redacción de los días descontados se modificó a mano');
		});
	});
});
