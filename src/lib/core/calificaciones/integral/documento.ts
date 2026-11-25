import type { CalificacionIntegral, Genero, MotivacionEditada, Notificador } from '@prisma/client';
import { calcularIntegral, erroresFactores, notaCalidad, puntajeOrganizacion, type ResultadoIntegral } from './integral';
import { motivacionEficienciaDespacho1, PLANTILLAS_DESPACHO_1, plantillaDe, plantillaSugerida } from './eficiencia-despacho-1';
import { comoTexto, mismoTexto, motivacionesPredeterminadas, parrafosLibres, type FactorEditable } from './motivacion';
import { motivacionesPredeterminadasDespacho1 } from './motivacion-despacho-1';
import { fraseDeDescuentos, motivacionEficiencia, type DescuentoNovedad, type DespachoEficiencia } from './motivacion-eficiencia';
import { cantidad, cifra, comoTitulo, enLetras, fechaLarga, nombreMes, palabras } from './redaccion';

/**
 * Redacción de la motivación: cada despacho seccional tiene la suya (despacho 1:
 * `motivacion-despacho-1.ts` y `eficiencia-despacho-1.ts`; despacho 2:
 * `motivacion.ts` y `motivacion-eficiencia.ts`). El mecanismo es el mismo: los
 * textos salen con los datos del sistema y lo digitado, y se pueden modificar.
 */
export type Redaccion = 'despacho1' | 'despacho2';

/** La redacción del despacho seccional que califica; sin despacho, la motivación se digita completa (null). */
export const redaccionDe = (numeroDespacho: number | null | undefined): Redaccion | null =>
	numeroDespacho === 1 ? 'despacho1' : numeroDespacho === 2 ? 'despacho2' : null;

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
	/** Redacción de los textos predeterminados; null: la motivación se digita completa. */
	redaccion: Redaccion | null;
	/**
	 * Ponente del despacho que califica y presidente, como están configurados hoy.
	 * Solo mientras la calificación integral se puede digitar (`seDigitaIntegral`);
	 * en otro estado, el formato usa únicamente lo que quedó guardado en ella.
	 */
	firmasConfiguradas?: Firmas;
};

/** Firmas del formato y quién notifica por correo (sin él, la notificación sale en blanco). */
export type Firmas = { ponente: string | null; presidente: string | null; notifica?: Notificador | null };

/**
 * La calificación integral se digita y se corrige con la calificación en revisión
 * o aprobada: también se completa después de que la sala aprueba el rendimiento.
 */
export const seDigitaIntegral = (estado: string) => estado === 'revision' || estado === 'aprobada';

export type Seccion = { titulo: string; parrafos: string[]; clave?: FactorEditable | 'eficiencia' };

/** Periodo calificado: lo digitado o, sin fecha, el año completo. */
export const periodoCalificado = (e: Pick<EntradaDocumento, 'periodo' | 'integral'>) => ({
	desde: e.integral?.periodoDesde ?? new Date(Date.UTC(e.periodo, 0, 1)),
	hasta: e.integral?.periodoHasta ?? new Date(Date.UTC(e.periodo, 11, 31)),
});

/** Ponente, presidente y quién notifica: lo guardado en la calificación; si falta, lo configurado. */
export const firmasDe = (e: Pick<EntradaDocumento, 'integral' | 'firmasConfiguradas'>) => ({
	ponente: e.integral?.ponente?.trim() || e.firmasConfiguradas?.ponente?.trim() || '',
	presidente: e.integral?.presidente?.trim() || e.firmasConfiguradas?.presidente?.trim() || '',
	notifica:
		(e.integral?.notifica?.nombre?.trim() ? e.integral.notifica : null) ??
		(e.firmasConfiguradas?.notifica?.nombre?.trim() ? e.firmasConfiguradas.notifica : null),
});

/** Iguales si coinciden nombre, cargo, cédula y expedición (sin contar espacios de más). */
const mismoNotificador = (a: Notificador | null | undefined, b: Notificador | null | undefined) => {
	const t = (n: Notificador | null | undefined) => [n?.nombre, n?.cargo, n?.cedula, n?.expedicion].map((x) => x?.trim() ?? '').join('|');
	return t(a) === t(b);
};

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
	if (!e.redaccion) {
		const libres = parrafosLibres(i?.motivacionLibre);
		return [{ titulo: '', parrafos: libres.length ? libres : [pendiente('digitar la motivación de la evaluación.')] }];
	}
	const d1 = e.redaccion === 'despacho1';

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
		d1
			? 'digitar el número de formularios del factor calidad.'
			: 'digitar el número de formularios y la suma de sus puntajes del factor calidad.'
	);
	let organizacion = elegir(
		i?.organizacionMotivacion,
		pre.organizacion,
		!d1
			? 'digitar la fecha de la visita y elegir el texto del factor organización del trabajo.'
			: i?.organizacionOpcion === 'otro'
				? 'escribir la motivación del factor organización del trabajo.'
				: 'elegir el texto del factor organización del trabajo.'
	);
	// Despacho 2: "Otro" sin texto propio deja solo el párrafo general; falta la motivación del puntaje.
	if (!d1 && i?.organizacionOpcion === 'otro' && !parrafosLibres(i.organizacionMotivacion?.texto).length && pre.organizacion)
		organizacion = [...organizacion, pendiente('escribir la motivación del puntaje de organización del trabajo.')];
	const despachos = despachosConDescuentos(e);
	const eficiencia = d1
		? motivacionEficienciaDespacho1({ genero, despachos, ponderada: e.eficiencia.ponderada, elegidas: i?.plantillasEficiencia })
		: motivacionEficiencia({ genero, despachos, ponderada: e.eficiencia.ponderada });
	const publicaciones = elegir(
		i?.publicacionesMotivacion,
		pre.publicaciones,
		i?.publicacionesPuntaje == null ? 'indicar el puntaje del factor publicaciones.' : 'digitar el texto de la publicación.'
	);

	const titulos = d1
		? ['FACTOR CALIDAD', 'FACTOR ORGANIZACIÓN DEL TRABAJO', 'FACTOR EFICIENCIA O RENDIMIENTO', 'FACTOR PUBLICACIONES']
		: ['1. FACTOR CALIDAD.', '2. FACTOR ORGANIZACIÓN DEL TRABAJO.', '3. FACTOR EFICIENCIA O RENDIMIENTO', '4. FACTOR PUBLICACIONES'];
	return [
		{ titulo: titulos[0], parrafos: calidad, clave: 'calidad' },
		{ titulo: titulos[1], parrafos: organizacion, clave: 'organizacion' },
		{ titulo: titulos[2], parrafos: eficiencia, clave: 'eficiencia' },
		{ titulo: titulos[3], parrafos: publicaciones, clave: 'publicaciones' },
	];
}

/** Texto predeterminado de cada factor con lo guardado, con la redacción del despacho que califica. */
export const predeterminadasDe = (e: Pick<EntradaDocumento, 'integral' | 'funcionario' | 'periodo' | 'redaccion'>) =>
	e.redaccion === 'despacho1'
		? motivacionesPredeterminadasDespacho1({ ...(e.integral ?? {}), genero: e.funcionario.genero })
		: motivacionesPredeterminadas({ ...(e.integral ?? {}), genero: e.funcionario.genero, periodo: e.periodo });

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
	const { desde, hasta } = periodoCalificado(e);
	const firmas = firmasDe(e);
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

		desdeDia: dos(desde.getUTCDate()),
		desdeMes: dos(desde.getUTCMonth() + 1),
		desdeAnio: String(desde.getUTCFullYear()),
		hastaDia: dos(hasta.getUTCDate()),
		hastaMes: dos(hasta.getUTCMonth() + 1),
		hastaAnio: String(hasta.getUTCFullYear()),
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

		ponente: firmas.ponente,
		firmaPresidente: firmas.presidente ? `Firma Presidente – ${firmas.presidente}` : 'Firma Presidente',
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
		...datosNotificacion(e, firmas.notifica, sala),
	};
}

/**
 * Lugar, días y firmas de la notificación, y la frase de la sesión. Con quien
 * notifica configurado (por correo electrónico), salen llenos como en el formato
 * del despacho 1; sin él, las líneas en blanco del formato oficial.
 */
function datosNotificacion(e: EntradaDocumento, n: Notificador | null, sala: Date | null) {
	const nombre = `${e.funcionario.nombres} ${e.funcionario.apellidos}`.trim().toUpperCase();
	const cargo = n?.cargo?.trim() ?? '';
	const despacho1 = e.redaccion === 'despacho1';
	return {
		notifLugar: n ? 'Tunja,' : '___________________________',
		// En blanco, con los mismos espacios del formato oficial ("a los  _______________  (____)  días").
		notifDias: n ? '(ver correo electrónico)' : ' _______________  (____) ',
		consejoDe: despacho1 ? ' de Boyacá y Casanare' : '',
		firmaNotificadoNombre: n ? nombre : '',
		ccNotificado: n ? e.funcionario.cedula : '________________',
		nombreNotificado: n ? nombre : '',
		quienNotificaFirma: n ? `${n.nombre.trim().toUpperCase()}${cargo ? ` – ${cargo.toUpperCase()}` : ''} - (Por Correo Electrónico)` : '',
		ccNotifica: n?.cedula?.trim() || '___________________',
		ccNotificaDe: n?.expedicion?.trim() || '_________________________',
		nombreNotifica: n ? `${n.nombre.trim().toUpperCase()}${cargo ? ` - ${cargo}` : ''}` : '',
		aprobadaEn: despacho1
			? `Aprobada en sesión del día ${sala ? sala.getUTCDate() : '____'} del mes de ${sala ? nombreMes(sala) : '____________'} de ${sala ? sala.getUTCFullYear() : '______'}`
			: `Aprobada en Sesión del ${sala ? fechaLarga(sala) : '____________'}.`,
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
	const { desde, hasta } = periodoCalificado(e);
	if (desde.getTime() > hasta.getTime())
		avisos.push('El periodo calificado empieza después de la fecha en que termina: revise las fechas.');
	else if (desde.getUTCFullYear() !== e.periodo || hasta.getUTCFullYear() !== e.periodo)
		avisos.push(`El periodo calificado se sale del año ${e.periodo}: revise las fechas.`);
	const firmas = firmasDe(e);
	if (!firmas.ponente) avisos.push('Falta el ponente del despacho que califica: se configura en Configuración → Firmas.');
	if (!firmas.presidente) avisos.push('Falta el presidente: se configura en Configuración → Firmas.');
	// Lo guardado manda en el formato: si la configuración cambió después, hay que guardar de nuevo.
	const distinto = (guardado: string | null | undefined, configurado: string | null | undefined) =>
		!!guardado?.trim() && !!configurado?.trim() && guardado.trim() !== configurado.trim();
	const c = e.firmasConfiguradas;
	if (c && i?.notifica?.nombre?.trim() && c.notifica?.nombre?.trim() && !mismoNotificador(i.notifica, c.notifica))
		avisos.push(
			'Quién notifica cambió en la configuración después de guardar esta calificación: guarde de nuevo para que el formato lo tome.'
		);
	// El despacho 1 notifica por correo: sin quién notifica, esa parte del formato sale en blanco.
	if (e.redaccion === 'despacho1' && !firmas.notifica)
		avisos.push('Falta quién notifica por correo (Configuración → Firmas): la notificación del formato sale en blanco.');
	if (c && (distinto(i?.ponente, c.ponente) || distinto(i?.presidente, c.presidente)))
		avisos.push(
			'El ponente o el presidente configurado cambió después de guardar esta calificación: guarde de nuevo para que el formato lo tome.'
		);
	if (!i?.cargoCarrera?.cargo) avisos.push('Falta el cargo en carrera.');
	if (f.calidad == null) avisos.push('Falta el factor calidad (formularios y suma).');
	if (f.organizacion == null) avisos.push('Falta el factor organización del trabajo.');
	if (f.publicaciones == null) avisos.push('Falta el factor publicaciones.');
	const d1 = e.redaccion === 'despacho1';
	const d2 = e.redaccion === 'despacho2';
	if (d2 && i?.organizacionOpcion && !i.organizacionFechaVisita) avisos.push('Falta la fecha de la visita de organización del trabajo.');
	if (d2 && (i?.organizacionOpcion === 'sinEscuela' || i?.organizacionOpcion === 'sinAmbos') && !i.oficioEscuela?.trim())
		avisos.push('Falta el oficio de la Escuela Judicial que citan los textos 3 y 4 de organización.');
	// Los cuatro textos del despacho 1 citan el oficio.
	if (d1 && i?.organizacionOpcion && i.organizacionOpcion !== 'otro' && !i.oficioEscuela?.trim())
		avisos.push('Falta el oficio de la Escuela Judicial que citan los textos de organización del trabajo.');
	if (!e.redaccion && !i?.motivacionLibre?.trim()) avisos.push('Falta la motivación de la evaluación.');
	if (e.redaccion && i?.organizacionOpcion === 'otro' && !i.organizacionMotivacion?.texto.trim())
		avisos.push(
			d1
				? 'Eligió "Otro" en organización del trabajo: falta escribir la motivación de ese factor.'
				: 'Eligió "Otro" en organización del trabajo: falta escribir en el texto de ese factor la motivación del puntaje.'
		);
	if (e.redaccion && i?.publicacionesPuntaje === 1 && !i.publicacionesMotivacion?.texto.trim())
		avisos.push('Puntaje 1 en publicaciones: falta el texto de la publicación.');
	if (d1)
		// La especialidad elegida a mano para un juzgado, si no es la que corresponde a sus datos.
		for (const d of e.eficiencia.despachos.filter((x) => x.diasLaborados > 0)) {
			const elegida = plantillaDe(d, i?.plantillasEficiencia);
			const sugerida = plantillaSugerida(d);
			if (elegida !== sugerida)
				avisos.push(
					`En ${d.nombre} se eligió la redacción "${PLANTILLAS_DESPACHO_1[elegida]}"; según sus datos correspondería ` +
						`"${PLANTILLAS_DESPACHO_1[sugerida]}": revise que el texto de eficiencia corresponda.`
				);
		}
	if (e.redaccion && i) {
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
