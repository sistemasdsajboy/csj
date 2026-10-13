/**
 * Deja un nombre en una forma comparable: sin tildes, sin signos y en
 * mayúsculas. Sirve para nombres de despacho, de funcionario y de categoría,
 * que llegan escritos de distintas maneras según el archivo o según quién los
 * editó a mano.
 */
export const normalizarNombre = (nombre: string) =>
	nombre
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.toUpperCase();
