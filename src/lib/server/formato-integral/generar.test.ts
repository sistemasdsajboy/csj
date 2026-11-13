import PizZip from 'pizzip';
import { describe, expect, it } from 'vitest';
import { datosDocumento, type EntradaDocumento } from '$lib/core/calificaciones/integral/documento';
import { disposicionArchivo, generarFormatoIntegral } from './generar';

const fecha = (s: string) => new Date(`${s}T00:00:00Z`);
const textoDelDocx = (b: Buffer) => {
	const xml = new PizZip(b).file('word/document.xml')!.asText();
	return xml.replace(/<w:p[ >]/g, '\n<w:p ').replace(/<[^>]+>/g, '');
};

const integral = {
	fechaSala: fecha('2026-11-13'),
	cargoCarrera: { cargo: 'Juez Administrativo', municipio: 'Municipio de Prueba', distrito: 'Distrito de Prueba' },
	provisionalidad: [],
	calidadFormularios: 13,
	calidadSuma: 512,
	organizacionFechaVisita: fecha('2026-07-24'),
	organizacionOpcion: 'sinArl',
	organizacionPuntaje: null,
	oficioEscuela: null,
	publicacionesPuntaje: 0,
	calidadMotivacion: null,
	organizacionMotivacion: null,
	publicacionesMotivacion: null,
	descuentosEditados: [],
	motivacionLibre: null,
	ponente: 'Consejera Ponente: NOMBRE DE PRUEBA',
	presidente: 'NOMBRE DE PRUEBA',
	iniciales: 'AAA/BBB/',
};

const entrada = (over: Partial<EntradaDocumento> = {}): EntradaDocumento => ({
	periodo: 2025,
	funcionario: { nombres: 'Nombre De Prueba', apellidos: 'Apellido Prueba', cedula: '12345678', genero: 'femenino' },
	eficiencia: {
		ponderada: 21.35,
		despachos: [
			{
				nombre: 'JUZGADO 001 ADMINISTRATIVO DE PRUEBA',
				desde: fecha('2025-01-01'),
				hasta: fecha('2025-12-31'),
				diasHabilesDespacho: 228,
				diasLaborables: 228,
				diasLaborados: 225,
				descuentos: null,
				cargaEfectivaTotal: 754,
				egresoEfectivoTotal: 263,
				capacidad: 652,
				conEscritos: false,
				oral: { cargaDespacho: 714, cargaFuncionario: 714, cargaProporcional: 704.6, egreso: 263, total: 16.35, desglose: null },
				escrito: null,
				garantias: null,
				audiencias: { programadas: 41, atendidas: 41, ajenas: 0, justificadas: 0, noJustificadas: 0, puntaje: 5 },
				oralMasAudiencias: 21.35,
				total: 21.35,
			},
		],
	},
	integral,
	textosPredeterminados: true,
	...over,
});

describe('generarFormatoIntegral', () => {
	it('llena las celdas y no deja ninguna marca sin reemplazar', () => {
		const texto = textoDelDocx(generarFormatoIntegral(datosDocumento(entrada())));
		expect(texto).not.toMatch(/[{}]/);
		expect(texto).toContain('APELLIDO PRUEBA');
		expect(texto).toContain('12345678');
		expect(texto).toContain('JUEZ ADMINISTRATIVO');
		expect(texto).toContain('1. FACTOR CALIDAD.');
		expect(texto).toContain('3. FACTOR EFICIENCIA O RENDIMIENTO');
		expect(texto).toContain('se notifica personalmente a la doctora Nombre de Prueba Apellido Prueba, identificada');
		expect(texto).toContain('AAA/BBB/ Aprobada en Sesión del 13 de noviembre de 2026.');
		expect(texto).toContain('La notificada,');
		expect(texto).not.toContain('notificado (a)');
	});

	it('la nota integral y la X de la categoría: 39,38 + 21,35 + 11 + 0 = 72, buena', () => {
		const d = datosDocumento(entrada());
		expect(d).toMatchObject({
			calidad: '39,38',
			eficiencia: '21,35',
			organizacion: '11',
			publicaciones: '0',
			integral: '72',
			xBuena: 'X',
			xExcelente: '',
		});
	});

	it('sin cargos en provisionalidad la fila desaparece; con un cargo aparece una vez', () => {
		const sin = textoDelDocx(generarFormatoIntegral(datosDocumento(entrada())));
		expect(sin).not.toContain('CARGO EN PROVISIONALIDAD');
		const con = textoDelDocx(
			generarFormatoIntegral(
				datosDocumento(
					entrada({ integral: { ...integral, provisionalidad: [{ cargo: 'Juez Civil', municipio: 'Tunja', distrito: 'Tunja' }] } })
				)
			)
		);
		expect(con.match(/CARGO EN PROVISIONALIDAD/g)).toHaveLength(1);
		expect(con).toContain('JUEZ CIVIL');
	});

	it('la resolución de exclusión solo aparece si la calificación es insatisfactoria', () => {
		const buena = textoDelDocx(generarFormatoIntegral(datosDocumento(entrada())));
		expect(buena).not.toContain('RESUELVE');
		expect(buena).not.toContain('Sólo para calificaciones insatisfactorias');
		const mala = textoDelDocx(generarFormatoIntegral(datosDocumento(entrada({ integral: { ...integral, calidadSuma: 13 } }))));
		expect(mala).toContain('RESUELVE');
		expect(mala).toContain('Sólo para calificaciones insatisfactorias');
		expect(mala).not.toMatch(/[{}]/);
	});

	it('la fecha de la sala es la de la calificación y se repite en la notificación y al final', () => {
		const texto = textoDelDocx(generarFormatoIntegral(datosDocumento(entrada())));
		expect(texto).toContain(
			'el presente acto administrativo proferido por el Consejo Seccional de la Judicatura de Boyacá y Casanare, ' +
				'el día trece (13) del mes de noviembre (11) de dos mil veintiséis (2026).'
		);
		expect(datosDocumento(entrada())).toMatchObject({ salaDia: '13', salaMes: '11', salaAnio: '2026' });
		// El periodo a calificar es el año calificado completo.
		expect(datosDocumento(entrada())).toMatchObject({
			desdeDia: '01',
			desdeMes: '01',
			desdeAnio: '2025',
			hastaDia: '31',
			hastaMes: '12',
			hastaAnio: '2025',
		});
		// El día 1 se escribe "primero".
		const primero = datosDocumento(entrada({ integral: { ...integral, fechaSala: fecha('2027-03-01') } }));
		expect(primero).toMatchObject({ proferidoDia: 'primero', proferidoDiaNum: '1', proferidoMes: 'marzo', proferidoAnio: 'veintisiete' });
		// Sin fecha de sala, los espacios quedan en blanco como en el formato oficial.
		const sinSala = textoDelDocx(generarFormatoIntegral(datosDocumento(entrada({ integral: { ...integral, fechaSala: null } }))));
		expect(sinSala).toContain('el día _______________ (______) del mes de _____________________ (_______) de dos mil _________ (_______).');
		expect(sinSala).not.toMatch(/[{}]/);
	});

	it('lo que falta por digitar sale entre corchetes en el borrador', () => {
		const texto = textoDelDocx(generarFormatoIntegral(datosDocumento(entrada({ integral: null }))));
		expect(texto).toContain('[Pendiente: digitar el número de formularios');
		expect(texto).not.toMatch(/[{}]/);
	});

	it('despacho sin textos predeterminados: la motivación digitada a mano', () => {
		const docx = generarFormatoIntegral(
			datosDocumento(
				entrada({ textosPredeterminados: false, integral: { ...integral, motivacionLibre: 'Primer párrafo.\n\nSegundo párrafo.' } })
			)
		);
		const texto = textoDelDocx(docx);
		expect(texto).toContain('Primer párrafo.');
		expect(texto).toContain('Segundo párrafo.');
		expect(texto).not.toContain('1. FACTOR CALIDAD.');
		// Sin título no queda una línea vacía arriba: el primer párrafo de la celda de
		// la motivación es el texto digitado.
		const xml = new PizZip(docx).file('word/document.xml')!.asText();
		const texto1 = xml.indexOf('Primer párrafo.');
		const celda = Math.max(xml.lastIndexOf('<w:tc>', texto1), xml.lastIndexOf('<w:tc ', texto1));
		expect(texto1).toBeLessThan(xml.indexOf('</w:p>', celda));
	});

	it('la marca de borrador sale solo mientras está en revisión, y sin ella no queda línea de más', () => {
		const xml = (b: Buffer) => new PizZip(b).file('word/document.xml')!.asText();
		const con = generarFormatoIntegral({ ...datosDocumento(entrada()), borrador: true });
		const sin = generarFormatoIntegral({ ...datosDocumento(entrada()), borrador: false });
		expect(textoDelDocx(con)).toContain('BORRADOR – CALIFICACIÓN EN REVISIÓN, SIN APROBAR');
		expect(textoDelDocx(sin)).not.toContain('BORRADOR');
		// Con la marca hay exactamente un párrafo más: el del aviso.
		const parrafos = (x: string) => (x.match(/<w:p[ >]/g) ?? []).length;
		expect(parrafos(xml(con)) - parrafos(xml(sin))).toBe(1);
	});
});

describe('disposicionArchivo', () => {
	it('da un nombre ASCII seguro y el nombre con tildes en UTF-8', () => {
		const d = disposicionArchivo(`Calificacion integral 2025 - PÉREZ "x"\r\nO'NEIL (borrador).docx`);
		expect(d).toMatch(/^attachment; filename="[A-Za-z0-9 ._()-]+"; filename\*=UTF-8''[A-Za-z0-9%._~!-]+$/);
		expect(d).toContain('PEREZ');
		expect(d).toContain('P%C3%89REZ');
		expect(d).not.toMatch(/[\r\n]/);
	});
});
