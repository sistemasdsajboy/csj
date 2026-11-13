import type { CalificacionIntegral, Genero, MotivacionEditada } from '@prisma/client';
import { calcularIntegral, erroresFactores, notaCalidad, puntajeOrganizacion, type ResultadoIntegral } from './integral';
import { comoTexto, mismoTexto, motivacionesPredeterminadas, parrafosLibres, type FactorEditable } from './motivacion';
import { fraseDeDescuentos, motivacionEficiencia, type DescuentoNovedad, type DespachoEficiencia } from './motivacion-eficiencia';
import { cantidad, cifra, comoTitulo, enLetras, fechaLarga, nombreMes, palabras } from './redaccion';

/**
 * Arma, a partir de los datos del sistema y de lo digitado, el contenido de
 * cada marca de la plantilla del formato de calificación integral. Función
 * pura: la plantilla y la generación del .docx están en
 * `src/lib/server/formato-integral`.
 *
 * Lo que falta por digitar sale entre corchetes, para que el borrador muestre
 * qué queda pendiente.
 */

export type EntradaDocumento = {
	periodo: number;
	funcionario: { nombres: string; apellidos: string; cedula: string; genero: Genero | null };
	eficiencia: { despachos: DespachoEficiencia[]; ponderada: number };
	integral: CalificacionIntegral | null;
	/** Con textos predeterminados (despacho 2) o con la motivación digitada a mano (despacho 1). */
	textosPredeterminados: boolean;
};

export type Seccion = { titulo: string; parrafos: string[] };

const pendiente = (que: string) => `[Pendiente: ${que}]`;

export function factoresDe(e: Pick<EntradaDocumento, 'integral' | 'eficiencia'>) {
	const i = e.integral;
	return {
		calidad: notaCalidad(i?.calidadFormularios, i?.calidadSuma),
		eficiencia: e.eficiencia.ponderada,
		organizacion: puntajeOrganizacion(i?.organizacionOpcion, i?.organizacionPuntaje),
		publicaciones: i?.publicacionesPuntaje ?? null,
	};
}

export function seccionesMotivacion(e: EntradaDocumento): Seccion[] {
	const i = e.integral;
	const genero = e.funcionario.genero;
	if (!e.textosPredeterminados) {
		const libres = parrafosLibres(i?.motivacionLibre);
		return [{ titulo: '', parrafos: libres.length ? libres : [pendiente('digitar la motivación de la evaluación.')] }];
	}

	const pre = predeterminadasDe(e);
	// Lo modificado a mano manda; si no hay, el texto predeterminado; si faltan datos, lo pendiente.
	const elegir = (editada: MotivacionEditada | null | undefined, predeterminada: string[] | null, falta: string) => {
		const propia = parrafosLibres(editada?.texto);
		if (propia.length) return propia;
		if (predeterminada?.length) return predeterminada;
		return [pendiente(falta)];
	};

	const calidad = elegir(
		i?.calidadMotivacion,
		pre.calidad,
		'digitar el número de formularios y la suma de sus puntajes del factor calidad.'
	);
	let organizacion = elegir(
		i?.organizacionMotivacion,
		pre.organizacion,
		'digitar la fecha de la visita y elegir el texto del factor organización del trabajo.'
	);
	// "Otro" sin texto propio deja solo el párrafo general: falta la motivación del puntaje.
	if (i?.organizacionOpcion === 'otro' && !parrafosLibres(i.organizacionMotivacion?.texto).length && pre.organizacion)
		organizacion = [...organizacion, pendiente('escribir la motivación del puntaje de organización del trabajo.')];
	const eficiencia = motivacionEficiencia({ genero, despachos: despachosConDescuentos(e), ponderada: e.eficiencia.ponderada });
	const publicaciones = elegir(
		i?.publicacionesMotivacion,
		pre.publicaciones,
		i?.publicacionesPuntaje == null ? 'indicar el puntaje del factor publicaciones.' : 'digitar el texto de la publicación.'
	);

	return [
		{ titulo: '1. FACTOR CALIDAD.', parrafos: calidad },
		{ titulo: '2. FACTOR ORGANIZACIÓN DEL TRABAJO.', parrafos: organizacion },
		{ titulo: '3. FACTOR EFICIENCIA O RENDIMIENTO', parrafos: eficiencia },
		{ titulo: '4. FACTOR PUBLICACIONES', parrafos: publicaciones },
	];
}

/** Texto predeterminado de cada factor con lo guardado. */
export const predeterminadasDe = (e: Pick<EntradaDocumento, 'integral' | 'funcionario' | 'periodo'>) =>
	motivacionesPredeterminadas({ ...(e.integral ?? {}), genero: e.funcionario.genero, periodo: e.periodo });

export type DescuentosDelJuzgado = { juzgado: string; descuentos: DescuentoNovedad[] };

/**
 * Las novedades con días descontados de cada juzgado donde trabajó el
 * funcionario en el periodo, una por una, con la descripción que arma el
 * sistema ("incapacidad (del ... al ...)"). Cada novedad pertenece a un solo
 * juzgado. La descripción se puede modificar; el número de días no.
 */
export const descuentosPorJuzgado = (e: Pick<EntradaDocumento, 'eficiencia'>): DescuentosDelJuzgado[] =>
	e.eficiencia.despachos.map((d) => ({ juzgado: d.nombre, descuentos: d.descuentosDetalle ?? [] }));

/** Todas las novedades con días descontados, de todos los juzgados. */
export const descuentosPredeterminados = (e: Pick<EntradaDocumento, 'eficiencia'>): DescuentoNovedad[] =>
	descuentosPorJuzgado(e).flatMap((g) => g.descuentos);

/**
 * Los despachos de eficiencia con las descripciones de los descuentos
 * modificadas a mano, si las hay. Cada juzgado arma su frase con sus novedades.
 */
function despachosConDescuentos(e: EntradaDocumento): DespachoEficiencia[] {
	const editados = e.integral?.descuentosEditados ?? [];
	if (!editados.length) return e.eficiencia.despachos;
	const propia = (novedadId: string) => parrafosLibres(editados.find((x) => x.novedadId === novedadId)?.texto).join(' ');
	return e.eficiencia.despachos.map((d) => {
		const detalle = d.descuentosDetalle ?? [];
		if (!detalle.some((n) => propia(n.novedadId))) return d;
		const items = detalle.map((n) => ({ dias: n.dias, descripcion: propia(n.novedadId) || n.descripcion }));
		return { ...d, descuentos: fraseDeDescuentos(items) };
	});
}

const NOMBRE_EDITABLE: Record<FactorEditable, string> = {
	calidad: 'calidad',
	organizacion: 'organización del trabajo',
	publicaciones: 'publicaciones',
};

const dos = (n: number) => String(n).padStart(2, '0');
/** En los actos, el día 1 se escribe "primero". */
const diaEnLetras = (dia: number) => (dia === 1 ? 'primero' : enLetras(dia));

/** Contenido de cada marca de la plantilla. */
export function datosDocumento(e: EntradaDocumento) {
	const i = e.integral;
	const p = palabras(e.funcionario.genero);
	const factores = factoresDe(e);
	const resultado: ResultadoIntegral = calcularIntegral(factores);
	const completa = resultado.completa;
	const sala = i?.fechaSala ?? null;
	const nombreCompleto = comoTitulo(`${e.funcionario.nombres} ${e.funcionario.apellidos}`.trim());

	return {
		apellidos: e.funcionario.apellidos.toUpperCase(),
		nombres: e.funcionario.nombres.toUpperCase(),
		cedula: e.funcionario.cedula,
		cargo: i?.cargoCarrera?.cargo?.toUpperCase() ?? '',
		municipio: i?.cargoCarrera?.municipio?.toUpperCase() ?? '',
		distrito: i?.cargoCarrera?.distrito?.toUpperCase() ?? '',
		provisionalidad: (i?.provisionalidad ?? [])
			.filter((c) => c.cargo?.trim())
			.map((c) => ({
				cargo: c.cargo!.toUpperCase(),
				municipio: c.municipio?.toUpperCase() ?? '',
				distrito: c.distrito?.toUpperCase() ?? '',
			})),

		desdeDia: '01',
		desdeMes: '01',
		desdeAnio: String(e.periodo),
		hastaDia: '31',
		hastaMes: '12',
		hastaAnio: String(e.periodo),
		salaDia: sala ? dos(sala.getUTCDate()) : '',
		salaMes: sala ? dos(sala.getUTCMonth() + 1) : '',
		salaAnio: sala ? String(sala.getUTCFullYear()) : '',
		salaLarga: sala ? fechaLarga(sala) : '____________',

		calidad: factores.calidad != null ? cifra(factores.calidad) : '',
		eficiencia: cifra(factores.eficiencia),
		organizacion: factores.organizacion != null ? cantidad(factores.organizacion) : '',
		publicaciones: factores.publicaciones != null ? String(factores.publicaciones) : '',
		integral: completa ? String(resultado.entero) : '',
		xExcelente: completa && resultado.categoria === 'EXCELENTE' ? 'X' : '',
		xBuena: completa && resultado.categoria === 'BUENA' ? 'X' : '',
		xInsatisfactoria: completa && resultado.categoria === 'INSATISFACTORIA' ? 'X' : '',
		insatisfactoria: completa && resultado.categoria === 'INSATISFACTORIA',

		secciones: seccionesMotivacion(e),

		ponente: i?.ponente?.trim() ?? '',
		firmaPresidente: i?.presidente?.trim() ? `Firma Presidente – ${i.presidente.trim()}` : 'Firma Presidente',
		iniciales: i?.iniciales?.trim() ?? '',

		// Fecha en que se profirió el acto (la de la sala), en letras y en cifras como pide el formato.
		proferidoDia: sala ? diaEnLetras(sala.getUTCDate()) : '_______________',
		proferidoDiaNum: sala ? String(sala.getUTCDate()) : '______',
		proferidoMes: sala ? nombreMes(sala) : '_____________________',
		proferidoMesNum: sala ? String(sala.getUTCMonth() + 1) : '_______',
		proferidoAnio: sala ? enLetras(sala.getUTCFullYear() - 2000) : '_________',
		proferidoAnioNum: sala ? String(sala.getUTCFullYear()) : '_______',

		notifMes: sala ? nombreMes(sala) : '___________________________',
		notifAnioLetras: sala ? enLetras(sala.getUTCFullYear() - 2000) : '_____________________',
		notifAnio: sala ? String(sala.getUTCFullYear()) : '20____',
		alDoctor: `${p.al} ${p.doctor}`,
		nombreCompleto,
		identificado: p.identificado,
		alInteresado: `${p.al} ${p.interesado}`,
		alNotificado: `${p.al} ${p.notificado}`,
		firmaNotificado: e.funcionario.genero ? `${p.el[0].toUpperCase()}${p.el.slice(1)} ${p.notificado}` : 'El notificado (a)',
	};
}

/** Lo que falta o está fuera de rango para que el formato quede completo. */
export function revisarCompletitud(e: EntradaDocumento): string[] {
	const i = e.integral;
	const avisos: string[] = [];
	const f = factoresDe(e);
	avisos.push(...erroresFactores(f));
	if (!e.funcionario.genero) avisos.push('Falta el género del funcionario: el texto queda con "(a)".');
	if (!i?.fechaSala) avisos.push('Falta la fecha de la sala (fecha de la calificación).');
	if (!i?.cargoCarrera?.cargo) avisos.push('Falta el cargo en carrera.');
	if (f.calidad == null) avisos.push('Falta el factor calidad (formularios y suma).');
	if (f.organizacion == null) avisos.push('Falta el factor organización del trabajo.');
	if (f.publicaciones == null) avisos.push('Falta el factor publicaciones.');
	if (e.textosPredeterminados && i?.organizacionOpcion && !i.organizacionFechaVisita)
		avisos.push('Falta la fecha de la visita de organización del trabajo.');
	if (
		e.textosPredeterminados &&
		(i?.organizacionOpcion === 'sinEscuela' || i?.organizacionOpcion === 'sinAmbos') &&
		!i.oficioEscuela?.trim()
	)
		avisos.push('Falta el oficio de la Escuela Judicial que citan los textos 3 y 4 de organización.');
	if (!e.textosPredeterminados && !i?.motivacionLibre?.trim()) avisos.push('Falta la motivación de la evaluación.');
	if (e.textosPredeterminados && i?.organizacionOpcion === 'otro' && !i.organizacionMotivacion?.texto.trim())
		avisos.push('Eligió "Otro" en organización del trabajo: falta escribir en el texto de ese factor la motivación del puntaje.');
	if (e.textosPredeterminados && i?.publicacionesPuntaje === 1 && !i.publicacionesMotivacion?.texto.trim())
		avisos.push('Puntaje 1 en publicaciones: falta el texto de la publicación.');
	if (e.textosPredeterminados && i) {
		// Un texto modificado a mano no se actualiza solo: si los datos cambiaron después, puede decir algo viejo.
		const pre = predeterminadasDe(e);
		const editadas: Record<FactorEditable, MotivacionEditada | null> = {
			calidad: i.calidadMotivacion,
			organizacion: i.organizacionMotivacion,
			publicaciones: i.publicacionesMotivacion,
		};
		for (const [f, editada] of Object.entries(editadas) as [FactorEditable, MotivacionEditada | null][])
			if (editada && !mismoTexto(editada.base, comoTexto(pre[f])))
				avisos.push(
					`El texto de ${NOMBRE_EDITABLE[f]} se modificó a mano y después cambiaron sus datos: revise que siga diciendo lo correcto.`
				);
		// Una descripción modificada cuya novedad cambió después (fechas o tipo).
		const detalle = descuentosPredeterminados(e);
		const cambiadas = (i.descuentosEditados ?? []).filter((x) => {
			const actual = detalle.find((d) => d.novedadId === x.novedadId);
			return actual && !mismoTexto(x.base, actual.descripcion);
		});
		if (cambiadas.length)
			avisos.push(
				'La redacción de los días descontados se modificó a mano y después cambiaron las novedades: revise que siga diciendo lo correcto.'
			);
	}
	return avisos;
}
