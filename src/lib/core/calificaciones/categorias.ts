import { normalizarNombre } from '$lib/utils/normalizar-nombre';

/**
 * Categorías del consolidado que el cálculo trata de forma especial.
 *
 * Vivían repetidas en `generar-calificacion.ts` y `fusionar-despachos.ts`, con
 * un comentario pidiendo cambiarlas en los dos sitios. Ahora hay una sola lista.
 *
 * SIERJU no escribe siempre igual el mismo nombre: hay consolidados con
 * "Movimiento de Tutelas", otros con "MOVIMIENTO DE TUTELAS", y variantes como
 * "primera instancia acciones constitucionales" o "Incidentes De Desacato".
 * Por eso NUNCA se comparan con `===` ni con un `in` exacto contra la base: se
 * comparan normalizados, sin mayúsculas, tildes ni signos. Ver H-35.
 */

/** Se reclasifican de oral a tutelas antes de calcular. */
export const CATEGORIAS_TUTELAS = [
	'Incidentes de Desacato',
	'Movimiento de Tutelas',
	'Procesos con sentencia y trámite posterior incidentes de Desacato',
	'Consultas Incidentes de Desacato',
	'Movimiento de Impugnaciones',
];

/** Se acumulan con los escritos cuando el despacho tiene procesos escritos. */
export const CATEGORIAS_CONSTITUCIONAL = ['Primera Instancia Acciones Constitucionales'];

/** En los penales de circuito con escritos, también pasan a escrito. */
export const CATEGORIAS_PENAL_ESCRITO = [
	'segunda Instancia Ejecución de penas y medidas de seguridad ccto',
	'Segunda Instancia Acciones Constitucionales',
];

/** Si la categoría es una de la lista, como sea que venga escrita. */
export const esCategoria = (categoria: string, lista: string[]) => {
	const buscada = normalizarNombre(categoria);
	return lista.some((c) => normalizarNombre(c) === buscada);
};

/**
 * De las categorías tal como están guardadas en la base, las que corresponden a
 * la lista. Devuelve los textos exactos guardados, para usarlos en una consulta.
 */
export const categoriasGuardadasDe = (lista: string[], guardadas: string[]) =>
	[...new Set(guardadas)].filter((categoria) => esCategoria(categoria, lista));
