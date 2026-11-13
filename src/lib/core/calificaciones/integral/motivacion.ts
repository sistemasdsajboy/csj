import type { Genero } from '@prisma/client';
import { OPCIONES_ORGANIZACION, esOpcionOrganizacion } from './integral';
import { cifra, fechaLarga, letrasYCifra, palabras } from './redaccion';

/**
 * Motivación de los factores calidad, organización del trabajo y
 * publicaciones, con la redacción del documento "Argumentos para motivar
 * calificación integral" del despacho 2. Lo que allí está en amarillo llega
 * como dato; lo que está en morado cambia con el género.
 *
 * Cada función devuelve los párrafos, sin el título del factor.
 */

export function motivacionCalidad(d: { genero: Genero | null; formularios: number; suma: number }): string[] {
	const p = palabras(d.genero);
	const nota = cifra(d.suma / d.formularios);
	const donde =
		d.formularios === 1
			? `en el formulario diligenciado por el superior funcional, el cual hace parte integrante de este acto administrativo`
			: `en los ${letrasYCifra(d.formularios)} formularios diligenciados por el superior funcional, los cuales hacen parte integrante de este acto administrativo`;
	return [
		`La motivación de la calificación del factor calidad ${p.del} ${p.funcionario} se encuentra ${donde}. ` +
			`El resultado de ${nota} puntos se obtuvo de dividir la sumatoria de los puntajes de los formularios remitidos a este ` +
			`Consejo Seccional (${cifra(d.suma)}) entre el número de formularios, conforme al artículo 31 del Acuerdo PSAA16-10618 de 2016.`,
	];
}

export function motivacionOrganizacion(d: {
	genero: Genero | null;
	fechaVisita: Date;
	opcion: string;
	periodo: number;
	oficioEscuela?: string | null;
}): string[] {
	const p = palabras(d.genero);
	const general =
		`La motivación de la calificación del factor organización del trabajo se encuentra en el formulario diligenciado por este ` +
		`Consejo Seccional con base en la visita practicada el ${fechaLarga(d.fechaVisita)}, el cual hace parte integrante de este ` +
		`acto administrativo. En él se resaltó que ${p.el} ${p.senor} Juez cumple las normas de carrera judicial en el ejercicio de la ` +
		`potestad nominadora y los parámetros establecidos para la consolidación de la calificación integral de servicios de los ` +
		`empleados del despacho, y que maneja adecuadamente las situaciones administrativas. Se evidenciaron una apropiada dirección ` +
		`del juzgado, procedimientos de trabajo que incorporan buenas prácticas, el uso correcto y oportuno de las tecnologías de la ` +
		`información y las comunicaciones, y el cumplimiento de los reglamentos expedidos por el Consejo Superior de la Judicatura ` +
		`para el seguimiento y el reporte estadístico en la plataforma SIERJU.`;

	if (!esOpcionOrganizacion(d.opcion)) throw new Error(`Opción de organización del trabajo desconocida: ${d.opcion}`);
	const oficio = d.oficioEscuela?.trim() || '[OFICIO DE LA ESCUELA JUDICIAL]';
	const puntaje = OPCIONES_ORGANIZACION[d.opcion].puntaje;

	const especifico: Record<typeof d.opcion, string> = {
		completo:
			`Al verificar los cinco subfactores previstos en el artículo 47 del Acuerdo PSAA16-10618 de 2016, se observó el ` +
			`cumplimiento de todos los ítems, incluida la participación en actividades de formación y bienestar; por estas razones, ` +
			`obtuvo en este factor una calificación de ${puntaje} puntos.`,
		sinArl:
			`Verificados los cinco subfactores que conforman la evaluación del factor Organización del Trabajo, según lo dispuesto en ` +
			`el artículo 47 del Acuerdo PSAA16-10618, se encontró que ${p.el} ${p.funcionario} no participó en actividades de formación ` +
			`ni en las de seguridad y salud en el trabajo, no obstante haber sido ${p.invitado} por medio del correo electrónico ` +
			`institucional. Advirtiendo que las pausas activas realizadas en el despacho no se consideran capacitaciones; ya que son ` +
			`breves ejercicios realizados durante la jornada laboral para mejorar el desempeño, reducir el estrés y prevenir lesiones, ` +
			`las cuales tienen una duración entre 5 a 10 minutos. Por ello, se dispuso una disminución de un punto en el sub factor 2C, ` +
			`obteniendo una calificación en este factor de ${puntaje} puntos.`,
		sinEscuela:
			`Verificados los cinco subfactores que conforman la evaluación del factor Organización del Trabajo, según lo dispuesto en ` +
			`el artículo 47 del Acuerdo PSAA16-10618, se encontró que ${p.el} ${p.funcionario} no participó en los programas de ` +
			`formación de la Escuela Judicial «Rodrigo Lara Bonilla» de ${d.periodo}, según el oficio ${oficio}; por lo que, se dispuso ` +
			`una disminución de dos (2) puntos en el subfactor 4. Por estas razones, obtuvo en este factor una calificación de ` +
			`${puntaje} puntos.`,
		sinAmbos:
			`Al verificar los cinco subfactores previstos en el artículo 47 del Acuerdo PSAA16-10618 de 2016, se descontó un (1) punto ` +
			`en el subfactor 2.c), porque ${p.el} ${p.funcionario} no participó en las actividades de formación ni en las de seguridad ` +
			`y salud en el trabajo pese a haber sido ${p.invitado} por correo electrónico institucional, y dos (2) puntos en el ` +
			`subfactor 4, porque no figura como participante en los programas de formación de la Escuela Judicial «Rodrigo Lara ` +
			`Bonilla» de ${d.periodo}, según el oficio ${oficio}. Por estas razones, obtuvo en este factor una calificación de ` +
			`${puntaje} puntos.`,
		otro: '',
	};

	// "Otro": solo el párrafo general; la motivación del puntaje la escribe quien califica.
	if (d.opcion === 'otro') return [general];
	return [general, especifico[d.opcion]];
}

export function motivacionPublicaciones(d: { genero: Genero | null; puntaje: number }): string[] {
	const p = palabras(d.genero);
	if (d.puntaje === 0)
		return [
			`${p.el.charAt(0).toUpperCase() + p.el.slice(1)} ${p.funcionario} no presentó publicaciones para la evaluación de este factor.`,
		];
	// Con publicación no hay texto predeterminado: lo escribe quien califica.
	return [];
}

export type FactorEditable = 'calidad' | 'organizacion' | 'publicaciones';

/**
 * Texto predeterminado de cada factor con lo digitado; null si faltan los datos
 * para armarlo. Quien califica puede modificarlo; ver `MotivacionEditada`.
 */
export function motivacionesPredeterminadas(d: {
	genero: Genero | null;
	periodo: number;
	calidadFormularios?: number | null;
	calidadSuma?: number | null;
	organizacionFechaVisita?: Date | null;
	organizacionOpcion?: string | null;
	oficioEscuela?: string | null;
	publicacionesPuntaje?: number | null;
}): Record<FactorEditable, string[] | null> {
	const { genero } = d;
	return {
		calidad:
			d.calidadFormularios && d.calidadSuma != null
				? motivacionCalidad({ genero, formularios: d.calidadFormularios, suma: d.calidadSuma })
				: null,
		organizacion:
			d.organizacionFechaVisita && esOpcionOrganizacion(d.organizacionOpcion)
				? motivacionOrganizacion({
						genero,
						fechaVisita: d.organizacionFechaVisita,
						opcion: d.organizacionOpcion,
						periodo: d.periodo,
						oficioEscuela: d.oficioEscuela,
					})
				: null,
		publicaciones: d.publicacionesPuntaje != null ? motivacionPublicaciones({ genero, puntaje: d.publicacionesPuntaje }) : null,
	};
}

/** Los párrafos como se ven en un cuadro de texto: separados por una línea en blanco. */
export const comoTexto = (parrafos: string[] | null | undefined) => (parrafos ?? []).join('\n\n');

/** Dos textos dicen lo mismo si tienen los mismos párrafos, sin contar espacios ni saltos de línea de más. */
export const mismoTexto = (a: string | null | undefined, b: string | null | undefined) =>
	comoTexto(parrafosLibres(a)) === comoTexto(parrafosLibres(b));

/** La motivación digitada a mano: un párrafo por cada bloque separado por una línea en blanco. */
export const parrafosLibres = (texto: string | null | undefined) =>
	(texto ?? '')
		.split(/\n\s*\n/)
		.map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
		.filter(Boolean);
