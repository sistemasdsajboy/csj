/**
 * Calificación integral de servicios (Acuerdo PSAA16-10618 de 2016).
 *
 * Art. 22: calidad hasta 42, eficiencia hasta 45, organización del trabajo
 * hasta 12, publicaciones hasta 1. El resultado se da en números enteros y la
 * aproximación solo se hace sobre el resultado final; el instructivo del
 * formato dice que de ,50 en adelante se sube.
 *
 * Art. 23: excelente de 85 a 100, buena de 60 a 84, insatisfactoria de 0 a 59.
 */

export const MAXIMOS = { calidad: 42, eficiencia: 45, organizacion: 12, publicaciones: 1 } as const;

/**
 * Textos predeterminados del factor organización del trabajo (documento de
 * argumentos para motivar del despacho 2). El texto elegido fija el puntaje.
 */
export const OPCIONES_ORGANIZACION = {
	completo: { puntaje: 12, etiqueta: 'Texto 1 – 12 puntos: cumple todos los subfactores' },
	sinArl: {
		puntaje: 11,
		etiqueta: 'Texto 2 – 11 puntos: no participó en actividades de formación ni de seguridad y salud en el trabajo (ARL)',
	},
	sinEscuela: { puntaje: 10, etiqueta: 'Texto 3 – 10 puntos: no participó en los programas de la Escuela Judicial' },
	sinAmbos: { puntaje: 9, etiqueta: 'Texto 4 – 9 puntos: ni ARL ni Escuela Judicial' },
	otro: { puntaje: null, etiqueta: 'Otro – puntaje y texto a mano' },
} as const;

export type OpcionOrganizacion = keyof typeof OPCIONES_ORGANIZACION;

// `Object.hasOwn` y no `in`: con `in`, "constructor" o "toString" pasarían por opciones válidas.
export const esOpcionOrganizacion = (x: unknown): x is OpcionOrganizacion =>
	typeof x === 'string' && Object.hasOwn(OPCIONES_ORGANIZACION, x);

/** Factor calidad (art. 31): suma de los puntajes dividida por el número de formularios. */
export function notaCalidad(formularios: number | null | undefined, suma: number | null | undefined): number | null {
	if (!formularios || formularios <= 0 || suma == null || suma < 0) return null;
	return suma / formularios;
}

export function puntajeOrganizacion(opcion: string | null | undefined, puntajeOtro: number | null | undefined): number | null {
	if (!esOpcionOrganizacion(opcion)) return null;
	const fijo = OPCIONES_ORGANIZACION[opcion].puntaje;
	return fijo ?? puntajeOtro ?? null;
}

/** De ,50 en adelante se sube. El margen absorbe el error de punto flotante de 84.4999999. */
export const redondear = (x: number) => Math.floor(x + 0.5 + 1e-9);

export type Categoria = 'EXCELENTE' | 'BUENA' | 'INSATISFACTORIA';

export const categoria = (entero: number): Categoria => (entero >= 85 ? 'EXCELENTE' : entero >= 60 ? 'BUENA' : 'INSATISFACTORIA');

export type Factores = {
	calidad: number | null;
	eficiencia: number | null;
	organizacion: number | null;
	publicaciones: number | null;
};

export type ResultadoIntegral =
	| { completa: false; faltan: (keyof Factores)[] }
	| { completa: true; suma: number; entero: number; categoria: Categoria };

export function calcularIntegral(f: Factores): ResultadoIntegral {
	const faltan = (Object.keys(MAXIMOS) as (keyof Factores)[]).filter((k) => f[k] == null);
	if (faltan.length) return { completa: false, faltan };
	const suma = f.calidad! + f.eficiencia! + f.organizacion! + f.publicaciones!;
	const entero = redondear(suma);
	return { completa: true, suma, entero, categoria: categoria(entero) };
}

/** Errores de los datos digitados: fuera de rango o incompletos donde no se puede deducir. */
export function erroresFactores(f: Factores): string[] {
	const errores: string[] = [];
	for (const k of Object.keys(MAXIMOS) as (keyof Factores)[]) {
		const v = f[k];
		if (v == null) continue;
		if (!Number.isFinite(v) || v < 0 || v > MAXIMOS[k] + 1e-9)
			errores.push(`El factor ${nombreFactor[k]} debe estar entre 0 y ${MAXIMOS[k]}; quedó en ${v}.`);
	}
	return errores;
}

export const nombreFactor: Record<keyof Factores, string> = {
	calidad: 'calidad',
	eficiencia: 'eficiencia o rendimiento',
	organizacion: 'organización del trabajo',
	publicaciones: 'publicaciones',
};
