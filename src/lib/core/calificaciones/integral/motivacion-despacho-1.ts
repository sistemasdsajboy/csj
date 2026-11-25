import type { Genero } from '@prisma/client';
import { esOpcionOrganizacion } from './integral';
import type { FactorEditable } from './motivacion';
import { palabras, type Palabras } from './redaccion';

/**
 * Motivación de los factores calidad, organización del trabajo y publicaciones
 * con la redacción del despacho 1 (formatos de la consejera ponente y su
 * documento "Motivaciones OT"). El despacho 2 tiene la suya en `motivacion.ts`;
 * el mecanismo es el mismo: el texto sale con los datos y se puede modificar.
 *
 * Respecto de los originales: el género se ajusta solo (los originales mezclaban
 * "la funcionaria" fija con campos de combinación), el oficio de la Escuela
 * Judicial es el que se digita, y se corrigió "de otra pare".
 */

const Mayuscula = (p: Palabras) => `${p.el.charAt(0).toUpperCase()}${p.el.slice(1)} ${p.funcionario}`;

const ARTICULO_29 =
	'Dado que al finalizar el periodo a evaluar no se había recibido el mínimo de formularios requeridos, este Consejo aplicó el ' +
	'procedimiento establecido en el artículo 29 del Acuerdo PSAA16-10618; solicitó y obtuvo del despacho una relación de los procesos ' +
	'terminados dentro del período que no fueron objeto de calificación; luego procedió a seleccionar al azar los procesos que se debían ' +
	'remitir al superior funcional hasta completar el mínimo exigido en el reglamento de calificación. Agotado el procedimiento antes ' +
	'descrito, la calificación del factor se obtuvo con los formatos recibidos de los superiores funcionales.';

export function motivacionCalidadDespacho1(d: { genero: Genero | null; formularios: number; articulo29: boolean }): string[] {
	const p = palabras(d.genero);
	const principal =
		d.formularios === 1
			? `La motivación de la calificación del factor calidad ${p.del} ${p.funcionario} se encuentra en el formulario diligenciado por el ` +
				`superior funcional, el cual hace parte integrante de este acto administrativo. El resultado corresponde al puntaje del único ` +
				`formulario remitido a este Consejo Seccional por el superior funcional, conforme se registra en el cuadro anexo que contiene el ` +
				`proceso y la providencia objeto de evaluación y su respectivo puntaje.`
			: `La motivación de la calificación del factor calidad ${p.del} ${p.funcionario} se encuentra en los formularios diligenciados por el ` +
				`superior funcional, los cuales hacen parte integrante de este acto administrativo. El resultado se obtuvo del promedio de la ` +
				`sumatoria de los ${d.formularios} formularios remitidos a este Consejo Seccional por el superior funcional, conforme se registra ` +
				`en el cuadro anexo que contiene cada uno de los procesos y providencias objeto de evaluación y su respectivo puntaje.`;
	return d.articulo29 ? [ARTICULO_29, principal] : [principal];
}

/** El párrafo de gestión tecnológica, común a los cuatro textos; `escuela` es la frase de la Escuela Judicial, si va. */
const tecnologia = (escuela: string) =>
	'En cuanto a la gestión tecnológica y de la información, se evidenció el uso correcto y oportuno de las tecnologías de la información ' +
	'y las comunicaciones, así como el registro y control adecuado de la información en los sistemas institucionales, incluyendo el ' +
	'diligenciamiento oportuno del SIERJU. Se constató, además, que se están realizando las conciliaciones de depósitos judiciales ' +
	`conforme a los procedimientos establecidos.${escuela} La verificación de la estadística reportada mostró coincidencia entre el ` +
	'inventario físico y el registrado en el sistema, dentro del margen permitido.';

/** Textos 1 a 4 de organización del trabajo; "otro" no tiene texto: lo escribe quien califica (null). */
export function motivacionOrganizacionDespacho1(d: {
	genero: Genero | null;
	opcion: string;
	oficioEscuela?: string | null;
}): string[] | null {
	if (!esOpcionOrganizacion(d.opcion)) throw new Error(`Opción de organización del trabajo desconocida: ${d.opcion}`);
	const p = palabras(d.genero);
	const El = Mayuscula(p);
	const oficio = d.oficioEscuela?.trim() || '[OFICIO DE LA ESCUELA JUDICIAL]';
	const custodia =
		`${El} mantuvo la custodia de los bienes y el inventario actualizado a 31 de diciembre del año correspondiente, en lo que ` +
		'depende del despacho.';
	const conArl =
		'Participó en actividades de formación y en programas de seguridad y salud en el trabajo, tal como se observa en los registros de ' +
		'asistencia suministrados por la ARL.';
	const sinArl =
		'no se encontró evidencia de su participación en formación y actividades de seguridad y salud en el trabajo durante el periodo ' +
		'evaluado y su nombre no aparece registrado como participante en los listados de asistencia suministrados por la ARL, por lo cual ' +
		'no se asigna el punto correspondiente a este subfactor';
	const sinEscuela =
		`tras la revisión del oficio ${oficio} de la Escuela Judicial Rodrigo Lara Bonilla, no se encontró el nombre ${p.del} ${p.funcionario} ` +
		'registrado como participante en eventos de formación certificados durante el periodo evaluado, razón por la cual no es posible ' +
		'asignar los dos puntos correspondientes a la participación en programas de formación, conforme con lo establecido en el numeral 4, ' +
		'del artículo 47 citado';
	const mejora =
		'En la dirección del despacho, se evidenció una planeación organizada de las actividades, así como la implementación de acciones ' +
		'orientadas a la mejora y el seguimiento de estas, aplicando procedimientos de trabajo que incorporan buenas prácticas';

	switch (d.opcion) {
		case 'completo':
			return [
				`Tal como se registró en la visita, durante el periodo evaluado, ${p.el} ${p.funcionario} cumplió con todos los subfactores ` +
					'establecidos en el artículo 47 del Acuerdo PSAA16-10618 de 2016, razón por la cual se le asigna el máximo puntaje posible. Se ' +
					'verificó la aplicación de las normas de carrera judicial en la calificación integral de empleados y un manejo adecuado de las ' +
					`situaciones administrativas. En la dirección del despacho, se evidenció una planeación organizada de las actividades. ${custodia} ${conArl}`,
				tecnologia(
					' También, participó en los programas de formación impartidos por la Escuela Judicial “Rodrigo Lara Bonilla”, evidenciado en ' +
						`la consulta del oficio ${oficio} expedido por la citada dependencia, en donde se encontró su nombre como asistente en eventos ` +
						'de formación programados durante el periodo evaluado.'
				),
			];
		case 'sinArl':
			return [
				'Tal como se registró en la visita, de conformidad con lo establecido en el artículo 47 del Acuerdo PSAA16-10618 de 2016, se ' +
					`verificó que ${p.el} ${p.funcionario} cumplió con la aplicación de las normas de carrera judicial en la calificación integral ` +
					`de empleados y un adecuado manejo de las situaciones administrativas. ${mejora} y contribuyen a la eficiencia del despacho. ` +
					`${custodia} Sin embargo, ${sinArl}.`,
				tecnologia(
					' Participó en los programas de formación impartidos por la Escuela Judicial “Rodrigo Lara Bonilla”, evidenciado tras la ' +
						`revisión del oficio ${oficio} expedido por la citada dependencia, en donde se encontró su nombre como asistente en eventos ` +
						'de formación programados durante el periodo evaluado.'
				),
				'Por lo anterior, la calificación en el factor organización del trabajo se otorga descontando los puntos por la no participación ' +
					'en formación y actividades de seguridad y salud en el trabajo, conforme a la normatividad vigente.',
			];
		case 'sinEscuela':
			return [
				'Tal como se registró en la visita, de conformidad con lo establecido en el artículo 47 del Acuerdo PSAA16-10618 de 2016, se ' +
					`verificó que ${p.el} ${p.funcionario} cumplió con la aplicación de las normas de carrera judicial en la calificación integral ` +
					'de empleados y un adecuado manejo de situaciones administrativas. En la dirección del despacho, se evidenció una planeación ' +
					`organizada de las actividades. ${custodia} ${conArl}`,
				tecnologia(''),
				`No obstante, ${sinEscuela}; precisando que estos eventos de formación son ofertados por la EJRLB en la página web de la Escuela ` +
					'Judicial y por correo electrónico enviado a todos los despachos judiciales. Por lo anterior, la calificación en el factor ' +
					'organización del trabajo se otorga descontando los puntos de formación, conforme a la normatividad vigente.',
			];
		case 'sinAmbos':
			return [
				'Tal como se registró en la visita, de conformidad con lo establecido en el artículo 47 del Acuerdo PSAA16-10618 de 2016, se ' +
					`verificó que ${p.el} ${p.funcionario} cumplió con la aplicación de las normas de carrera judicial en la calificación integral ` +
					`de empleados y un manejo adecuado de las situaciones administrativas. ${mejora}. ${custodia}`,
				tecnologia(''),
				`No obstante, ${sinArl} y, de otra parte, ${sinEscuela}; precisando que estos eventos de formación son ofertados por la EJRLB en ` +
					'la página web de la Escuela Judicial y por correo electrónico enviado a todos los despachos judiciales.',
				'Por lo anterior, la calificación en el factor organización del trabajo se otorga descontando los puntos correspondientes, por la ' +
					'no participación en las actividades de seguridad y salud en el trabajo y en los eventos de formación programados por la ' +
					'Escuela Judicial RLB, conforme a la normatividad vigente.',
			];
		case 'otro':
			return null;
	}
}

export function motivacionPublicacionesDespacho1(d: { genero: Genero | null; puntaje: number }): string[] {
	// Con publicación no hay texto predeterminado: lo escribe quien califica.
	return d.puntaje === 0 ? [`${Mayuscula(palabras(d.genero))} no presentó publicaciones para la evaluación de este factor.`] : [];
}

/** Texto predeterminado de cada factor con lo digitado; null si faltan los datos para armarlo. */
export function motivacionesPredeterminadasDespacho1(d: {
	genero: Genero | null;
	calidadFormularios?: number | null;
	calidadArticulo29?: boolean | null;
	organizacionOpcion?: string | null;
	oficioEscuela?: string | null;
	publicacionesPuntaje?: number | null;
}): Record<FactorEditable, string[] | null> {
	const { genero } = d;
	return {
		calidad: d.calidadFormularios
			? motivacionCalidadDespacho1({ genero, formularios: d.calidadFormularios, articulo29: !!d.calidadArticulo29 })
			: null,
		organizacion: esOpcionOrganizacion(d.organizacionOpcion)
			? motivacionOrganizacionDespacho1({ genero, opcion: d.organizacionOpcion, oficioEscuela: d.oficioEscuela })
			: null,
		publicaciones: d.publicacionesPuntaje != null ? motivacionPublicacionesDespacho1({ genero, puntaje: d.publicacionesPuntaje }) : null,
	};
}
