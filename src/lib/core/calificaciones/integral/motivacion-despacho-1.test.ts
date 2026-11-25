import type { CalificacionIntegral } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { revisarCompletitud, seccionesMotivacion, type EntradaDocumento } from './documento';
import type { OpcionOrganizacion } from './integral';
import {
	motivacionCalidadDespacho1,
	motivacionesPredeterminadasDespacho1,
	motivacionOrganizacionDespacho1,
	motivacionPublicacionesDespacho1,
} from './motivacion-despacho-1';
import type { DespachoEficiencia } from './motivacion-eficiencia';

const OFICIO = 'EJO26-73 de 2026';

describe('calidad (despacho 1)', () => {
	it('con el número de formularios, sin el párrafo del artículo 29', () => {
		const t = motivacionCalidadDespacho1({ genero: 'femenino', formularios: 33, articulo29: false });
		expect(t).toHaveLength(1);
		expect(t[0]).toContain('factor calidad de la funcionaria se encuentra en los formularios');
		expect(t[0]).toContain('de los 33 formularios remitidos');
	});

	it('con el artículo 29, ese párrafo va primero', () => {
		const t = motivacionCalidadDespacho1({ genero: 'masculino', formularios: 15, articulo29: true });
		expect(t).toHaveLength(2);
		expect(t[0]).toMatch(/^Dado que al finalizar el periodo a evaluar no se había recibido el mínimo de formularios/);
		expect(t[0]).toContain('artículo 29 del Acuerdo PSAA16-10618');
		expect(t[1]).toContain('del funcionario se encuentra');
	});

	it('un solo formulario, en singular', () => {
		const t = motivacionCalidadDespacho1({ genero: 'femenino', formularios: 1, articulo29: false })[0];
		expect(t).toContain('en el formulario diligenciado');
		expect(t).not.toContain('los 1 formularios');
	});
});

describe('organización del trabajo (despacho 1)', () => {
	const opciones: OpcionOrganizacion[] = ['completo', 'sinArl', 'sinEscuela', 'sinAmbos'];

	it('los cuatro textos: género ajustado, oficio digitado y sin campos sin llenar', () => {
		for (const opcion of opciones) {
			const fem = motivacionOrganizacionDespacho1({ genero: 'femenino', opcion, oficioEscuela: OFICIO })!.join(' ');
			const masc = motivacionOrganizacionDespacho1({ genero: 'masculino', opcion, oficioEscuela: OFICIO })!.join(' ');
			expect(fem).toContain(OFICIO);
			expect(fem).not.toMatch(/«|»|GENERO|EJO25-69/);
			expect(fem).toContain('La funcionaria mantuvo la custodia');
			expect(masc).toContain('El funcionario mantuvo la custodia');
			expect(masc).not.toMatch(/\bla funcionaria\b/i);
		}
	});

	it('cada texto dice lo que corresponde a su puntaje', () => {
		const t = (opcion: OpcionOrganizacion) =>
			motivacionOrganizacionDespacho1({ genero: 'femenino', opcion, oficioEscuela: OFICIO })!.join(' ');
		expect(t('completo')).toContain('cumplió con todos los subfactores');
		expect(t('sinArl')).toContain('no se asigna el punto correspondiente a este subfactor');
		expect(t('sinArl')).toContain('Participó en los programas de formación impartidos por la Escuela Judicial');
		expect(t('sinEscuela')).toContain('no es posible asignar los dos puntos');
		expect(t('sinEscuela')).toContain('Participó en actividades de formación y en programas de seguridad y salud en el trabajo');
		expect(t('sinAmbos')).toContain('y, de otra parte, tras la revisión del oficio');
		expect(t('sinAmbos')).not.toContain('otra pare');
		expect(t('sinAmbos')).toContain('no se encontró el nombre de la funcionaria registrado');
	});

	it('sin oficio, queda marcado para digitarlo', () => {
		expect(motivacionOrganizacionDespacho1({ genero: 'femenino', opcion: 'completo' })!.join(' ')).toContain(
			'[OFICIO DE LA ESCUELA JUDICIAL]'
		);
	});

	it('"Otro" no tiene texto: lo escribe quien califica', () => {
		expect(motivacionOrganizacionDespacho1({ genero: 'femenino', opcion: 'otro' })).toBeNull();
	});
});

describe('publicaciones y textos predeterminados (despacho 1)', () => {
	it('publicaciones', () => {
		expect(motivacionPublicacionesDespacho1({ genero: 'femenino', puntaje: 0 })).toEqual([
			'La funcionaria no presentó publicaciones para la evaluación de este factor.',
		]);
		expect(motivacionPublicacionesDespacho1({ genero: 'masculino', puntaje: 1 })).toEqual([]);
	});

	it('sin datos, sin texto', () => {
		expect(motivacionesPredeterminadasDespacho1({ genero: 'femenino' })).toEqual({
			calidad: null,
			organizacion: null,
			publicaciones: null,
		});
	});
});

describe('calificación del despacho 1 en el formato', () => {
	const integral: CalificacionIntegral = {
		fechaSala: null,
		cargoCarrera: { cargo: 'Jueza Civil Municipal', municipio: 'Chiquinquirá', distrito: 'Tunja' },
		provisionalidad: [],
		calidadFormularios: 33,
		calidadSuma: 1300,
		calidadArticulo29: true,
		organizacionFechaVisita: null,
		organizacionOpcion: 'sinEscuela',
		organizacionPuntaje: null,
		oficioEscuela: null,
		publicacionesPuntaje: 0,
		calidadMotivacion: null,
		organizacionMotivacion: null,
		publicacionesMotivacion: null,
		descuentosEditados: [],
		plantillasEficiencia: [],
		motivacionLibre: null,
		periodoDesde: null,
		periodoHasta: null,
		ponente: null,
		presidente: null,
		notifica: null,
		iniciales: null,
	};
	const juzgado: DespachoEficiencia = {
		despachoId: '6a0000000000000000000001',
		nombre: 'JUZGADO 002 CIVIL MUNICIPAL DE CHIQUINQUIRA',
		especialidad: 'Civil',
		categoria: 'Municipal',
		desde: new Date(Date.UTC(2025, 0, 1)),
		hasta: new Date(Date.UTC(2025, 11, 31)),
		diasHabilesDespacho: 228,
		diasLaborables: 228,
		diasLaborados: 228,
		descuentos: null,
		cargaEfectivaTotal: 739,
		egresoEfectivoTotal: 406,
		capacidad: 1359,
		conEscritos: false,
		esGarantias: false,
		oral: { cargaDespacho: 739, cargaFuncionario: 739, cargaProporcional: 739, egreso: 406, total: 21.9756, desglose: null },
		escrito: null,
		garantias: null,
		audiencias: { programadas: 66, atendidas: 55, ajenas: 11, justificadas: 0, noJustificadas: 0, puntaje: 5 },
		oralMasAudiencias: 26.9756,
		total: 26.9756,
	};
	const entrada = (i: Partial<CalificacionIntegral> = {}): EntradaDocumento => ({
		periodo: 2025,
		funcionario: { nombres: 'Nombre', apellidos: 'Apellido', cedula: '1', genero: 'femenino' },
		eficiencia: { despachos: [juzgado], ponderada: 26.9756 },
		integral: { ...integral, ...i },
		redaccion: 'despacho1',
	});

	it('las cuatro secciones con sus títulos y la redacción del despacho 1', () => {
		const s = seccionesMotivacion(entrada());
		expect(s.map((x) => x.titulo)).toEqual([
			'FACTOR CALIDAD',
			'FACTOR ORGANIZACIÓN DEL TRABAJO',
			'FACTOR EFICIENCIA O RENDIMIENTO',
			'FACTOR PUBLICACIONES',
		]);
		expect(s[0].parrafos[0]).toMatch(/^Dado que al finalizar/);
		expect(s[1].parrafos.join(' ')).toContain('no es posible asignar los dos puntos');
		expect(s[2].parrafos.join(' ')).toContain('egreso base calificación: 406 / Carga proporcional: 739 X 40 = 21,98.');
		expect(s[3].parrafos).toEqual(['La funcionaria no presentó publicaciones para la evaluación de este factor.']);
	});

	it('sin la fecha de la visita no avisa (sus textos no la citan); sin el oficio, sí', () => {
		const avisos = revisarCompletitud(entrada());
		expect(avisos.join(' ')).not.toContain('fecha de la visita');
		expect(avisos).toContain('Falta el oficio de la Escuela Judicial que citan los textos de organización del trabajo.');
		expect(revisarCompletitud(entrada({ oficioEscuela: OFICIO })).join(' ')).not.toContain('Falta el oficio');
	});

	it('quién notifica: avisa si falta y si la configuración cambió después de guardar', () => {
		const notifica = { nombre: 'NOMBRE', cargo: 'Secretaria', cedula: '1', expedicion: 'Tunja' };
		expect(revisarCompletitud(entrada())).toContain(
			'Falta quién notifica por correo (Configuración → Firmas): la notificación del formato sale en blanco.'
		);
		expect(revisarCompletitud(entrada({ notifica })).join(' ')).not.toContain('Falta quién notifica');
		const cambiado = {
			...entrada({ notifica }),
			firmasConfiguradas: { ponente: null, presidente: null, notifica: { ...notifica, cedula: '2' } },
		};
		expect(revisarCompletitud(cambiado).join(' ')).toContain('Quién notifica cambió en la configuración');
		// La configurada sirve aunque la calificación aún no la tenga guardada.
		const configurada = { ...entrada(), firmasConfiguradas: { ponente: null, presidente: null, notifica } };
		expect(revisarCompletitud(configurada).join(' ')).not.toContain('Falta quién notifica');
	});

	it('avisa si la especialidad elegida no es la que corresponde a los datos', () => {
		const e = entrada({ plantillasEficiencia: [{ despachoId: juzgado.despachoId!, plantilla: 'promiscuoOral' }] });
		expect(revisarCompletitud(e).join(' ')).toContain('se eligió la redacción "Promiscuo municipal oral"');
		expect(revisarCompletitud(entrada()).join(' ')).not.toContain('se eligió la redacción');
	});

	it('"Otro" sin texto propio queda pendiente y avisa', () => {
		const e = entrada({ organizacionOpcion: 'otro', organizacionPuntaje: 10 });
		expect(seccionesMotivacion(e)[1].parrafos[0]).toMatch(/^\[Pendiente: escribir la motivación/);
		expect(revisarCompletitud(e)).toContain('Eligió "Otro" en organización del trabajo: falta escribir la motivación de ese factor.');
	});
});
