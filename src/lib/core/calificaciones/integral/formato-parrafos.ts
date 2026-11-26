/**
 * Cómo se ve cada párrafo de la motivación en el Word: partes en negrilla y
 * fórmulas centradas. Solo en los textos que arma el sistema (eficiencia y
 * calificación integral); los que digita o modifica quien califica salen tal cual.
 *
 * Lo que va en negrilla sigue los formatos de los despachos: los títulos, el
 * juzgado, los nombres de los subfactores, los totales y los resultados de cada cuenta.
 */

export type Parte = { t: string; n: boolean };
export type ParrafoFormato = { centrado: boolean; partes: Parte[] };

/** El párrafo entero en negrilla. */
const ENTEROS = [
	/^TOTAL FACTOR EFICIENCIA O RENDIMIENTO/,
	/^[A-D]\. Factor Eficiencia o Rendimiento/,
	/^FACTOR EFICIENCIA O RENDIMIENTO\b/,
	/^SUBFACTOR [^:]+:$/,
	/^PONDERACIÓN/,
	/^PUNTAJE CONSOLIDADO/,
	// Encabezado de juzgado del despacho 1: "JUZGADO 001 ...: Período 01/01/2025 - 31/12/2025".
	/^[^a-z]+: Período \d/,
];

/** Solo el comienzo, hasta los dos puntos: los nombres de los subfactores del despacho 1. */
const COMIENZOS = [/^-\s?Subfactor [^:]+:/, /^-\s?Factor eficiencia o rendimiento [^:]+:/, /^PUNTAJE DEL SUBFACTOR:/];

/** El resultado de una cuenta (el grupo 1). */
const RESULTADOS = [
	/ = (\d+,\d+)\.?$/,
	/ X (?:40|45|5) = (\d+,\d+)/,
	/el puntaje es de (\d+,\d+)/,
	/[Pp]romedio: (\d+,\d+)/,
	// "Total subfactores ...: 28,48." (despacho 1).
	/: (\d+,\d+)\.$/,
	/corresponde a (\d+ puntos)/,
];

/** Las fórmulas del despacho 2, que van solas en su línea: "(111 / 141,00) × 40 = 31,49". */
const FORMULA = /^\(.*\) × \d+ = /;

export function formatoParrafo(texto: string, conResaltes: boolean): ParrafoFormato {
	if (!conResaltes) return { centrado: false, partes: [{ t: texto, n: false }] };
	if (ENTEROS.some((r) => r.test(texto))) return { centrado: false, partes: [{ t: texto, n: true }] };

	const tramos: [number, number][] = [];
	for (const r of COMIENZOS) {
		const m = r.exec(texto);
		if (m) tramos.push([m.index, m.index + m[0].length]);
	}
	for (const r of RESULTADOS) {
		const global = new RegExp(r.source, r.flags.includes('g') ? r.flags : r.flags + 'g');
		for (const m of texto.matchAll(global)) {
			const inicio = m.index! + m[0].lastIndexOf(m[1]);
			tramos.push([inicio, inicio + m[1].length]);
		}
	}
	// Ordenados y sin solaparse.
	tramos.sort((a, b) => a[0] - b[0]);
	const partes: Parte[] = [];
	let cursor = 0;
	for (const [inicio, fin] of tramos) {
		if (inicio < cursor) continue;
		if (inicio > cursor) partes.push({ t: texto.slice(cursor, inicio), n: false });
		partes.push({ t: texto.slice(inicio, fin), n: true });
		cursor = fin;
	}
	if (cursor < texto.length) partes.push({ t: texto.slice(cursor), n: false });
	return { centrado: FORMULA.test(texto), partes };
}
