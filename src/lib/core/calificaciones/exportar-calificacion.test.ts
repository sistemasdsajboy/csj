import { describe, expect, it } from 'vitest';
import { comoTexto, exportarCalificacion, type EntradaExportacion } from './exportar-calificacion';

const fecha = (s: string) => new Date(`${s}T00:00:00Z`);
const registro = (cargaEfectiva: number, nombre = 'FUNCIONARIO DE PRUEBA') => ({
	funcionario: { nombre },
	desde: fecha('2025-01-01'),
	hasta: fecha('2025-12-31'),
	dias: 228,
	inventarioInicial: 100,
	ingresoEfectivo: 50,
	cargaEfectiva,
	egresoEfectivo: 40,
	conciliaciones: 1,
	inventarioFinal: 110,
});
const subfactor = {
	totalInventarioInicial: 100,
	cargaBaseCalificacionDespacho: 150,
	cargaBaseCalificacionFuncionario: 150,
	egresoFuncionario: 40,
	cargaProporcional: 148.2456,
	totalSubfactor: 10.79,
};

const entrada = (over: Partial<EntradaExportacion> = {}): EntradaExportacion => ({
	funcionario: { nombre: 'FUNCIONARIO DE PRUEBA', documento: '123' },
	despacho: { codigo: '150013333001', nombre: 'JUZGADO DE PRUEBA' },
	otrosDespachos: [],
	calificacion: {
		periodo: 2025,
		estado: 'revision',
		calificacionPonderada: 37.24,
		calificacionTotalFactorEficiencia: 37.24,
		cargaEfectivaTotal: 846,
		egresoEfectivoTotal: 624,
		diasHabilesDespacho: 228,
		diasLaborables: 228,
		diasDescontados: 0,
		diasLaborados: 228,
		factorOralMasAudiencias: 37.24,
		calificacionAudiencias: 5,
	},
	capacidadMaxima: 830,
	novedades: [],
	consolidados: { oral: [registro(150)], tutelas: [], garantias: [], escrito: [] },
	subfactores: { oral: subfactor },
	audiencias: { programadas: 10, atendidas: 9, aplazadasAjenas: 1, aplazadasJustificadas: 0, aplazadasNoJustificadas: 0 },
	traspaso: [],
	...over,
});

const generado = new Date(2026, 10, 12, 9, 5);
const titulos = (e: EntradaExportacion) => exportarCalificacion(e, generado).secciones.map((s) => s.titulo);
const seccion = (e: EntradaExportacion, titulo: string) => exportarCalificacion(e, generado).secciones.find((s) => s.titulo === titulo);

describe('exportar la pantalla de la calificación', () => {
	it('encabezado, nombre de archivo y estado como en la pantalla', () => {
		const x = exportarCalificacion(entrada(), generado);
		expect(x.encabezado.map((e) => [e.etiqueta, comoTexto(e.valor)])).toEqual([
			['Funcionario', 'FUNCIONARIO DE PRUEBA'],
			['Cédula', '123'],
			['Periodo', '2025'],
			['Estado de la calificación', 'En revisión'],
			['Despacho', '150013333001 - JUZGADO DE PRUEBA'],
			['Generado', '12/11/2026 09:05'],
		]);
		expect(x.nombreArchivo).toBe('Calificacion 2025 - FUNCIONARIO DE PRUEBA - 150013333001');
	});

	it('la hora de generación es la local: de noche no salta al día siguiente', () => {
		const noche = new Date(2026, 10, 12, 23, 41);
		const x = exportarCalificacion(entrada(), noche);
		expect(comoTexto(x.encabezado.find((e) => e.etiqueta === 'Generado')!.valor)).toBe('12/11/2026 23:41');
	});

	it('las secciones en el orden de la pantalla; las que no tienen datos no salen', () => {
		expect(titulos(entrada())).toEqual(['Totales', 'Novedades', 'Días', 'Oral', 'Audiencias']);
		const todo = entrada({
			consolidados: { oral: [registro(150)], tutelas: [registro(20)], garantias: [registro(5)], escrito: [registro(8)] },
			subfactores: { oral: subfactor, garantias: subfactor, escrito: subfactor },
		});
		expect(titulos(todo)).toEqual(['Totales', 'Novedades', 'Días', 'Tutelas e incidentes', 'Oral', 'Garantías', 'Escrito', 'Audiencias']);
		// Una tabla con filas pero sin carga efectiva tampoco sale, como en la pantalla.
		expect(titulos(entrada({ consolidados: { oral: [registro(150)], tutelas: [registro(0)], garantias: [], escrito: [] } }))).not.toContain(
			'Tutelas e incidentes'
		);
	});

	it('las cifras con dos decimales donde la pantalla las pone', () => {
		const totales = seccion(entrada(), 'Totales')!;
		expect(totales.valores!.map((v) => [v.etiqueta, comoTexto(v.valor)])).toEqual([
			['Calificación factor eficiencia', '37.24'],
			['Carga efectiva total', '846'],
			['Egreso efectivo total', '624'],
			['Capacidad máxima de respuesta', '830'],
		]);
		const oral = seccion(entrada(), 'Oral')!;
		expect(oral.valores!.find((v) => v.etiqueta === 'Carga proporcional')!.valor).toEqual({ decimal: 148.25 });
		expect(comoTexto(oral.valores!.at(-1)!.valor)).toBe('37.24');
		expect(oral.tabla!.filas[0].slice(0, 4)).toEqual(['FUNCIONARIO DE PRUEBA', '01/01/2025', '31/12/2025', 228]);
	});

	it('la ponderada solo si es distinta; la capacidad solo si existe', () => {
		const x = entrada({ calificacion: { ...entrada().calificacion, calificacionPonderada: 35.1 }, capacidadMaxima: null });
		const etiquetas = seccion(x, 'Totales')!.valores!.map((v) => v.etiqueta);
		expect(etiquetas).toContain('Calificación ponderada');
		expect(etiquetas).not.toContain('Capacidad máxima de respuesta');
	});

	it('novedades: la tabla, o el aviso de que no hay', () => {
		expect(seccion(entrada(), 'Novedades')).toEqual({ titulo: 'Novedades', nota: 'Sin novedades registradas en el periodo' });
		const n = seccion(
			entrada({
				novedades: [
					{ type: 'otras', from: fecha('2025-01-01'), to: fecha('2025-04-20'), days: 64, diasDescontables: 0, notes: 'Encargo.' },
				],
			}),
			'Novedades'
		)!;
		expect(n.tabla!.filas).toEqual([['otras', '01/01/2025', '20/04/2025', 64, 0, 'Encargo.']]);
	});

	it('días laborables solo cuando la pantalla los muestra', () => {
		const etiquetas = (c: Partial<EntradaExportacion['calificacion']>) =>
			seccion(entrada({ calificacion: { ...entrada().calificacion, ...c } }), 'Días')!.valores!.map((v) => v.etiqueta);
		expect(etiquetas({})).not.toContain('Días laborables');
		expect(etiquetas({ diasLaborables: 200, diasLaborados: 190 })).toContain('Días laborables');
	});

	it('con varios despachos dice cuáles otros hay; el nombre de archivo no lleva caracteres prohibidos', () => {
		const x = exportarCalificacion(
			entrada({ otrosDespachos: [{ codigo: '2', nombre: 'OTRO' }], funcionario: { nombre: 'A/B: C*', documento: '1' } }),
			generado
		);
		expect(comoTexto(x.encabezado.find((e) => e.etiqueta.startsWith('Otros despachos'))!.valor)).toContain('2 - OTRO');
		expect(x.nombreArchivo).not.toMatch(/[\\/:*?"<>|]/);
	});

	it('el traspaso por cambio de código sale primero, con su explicación', () => {
		const x = entrada({
			traspaso: [
				{
					categoria: 'Oral',
					desde: fecha('2025-01-01'),
					hasta: fecha('2025-01-12'),
					inventarioInicial: 50,
					ingresoEfectivo: -50,
					egresoEfectivo: 0,
					inventarioFinal: 0,
				},
			],
		});
		const s = exportarCalificacion(x, generado).secciones[0];
		expect(s.titulo).toMatch(/^Traspaso por cambio de código/);
		expect(s.nota).toContain('12/01/2025');
	});
});
