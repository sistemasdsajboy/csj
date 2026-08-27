/**
 * Cuando un juzgado cambia de código, el reporte del código viejo se cierra
 * traspasando el inventario al nuevo: el inventario sale como **ingreso
 * negativo**, el inventario final queda en cero y no hay ningún egreso. Ese
 * tramo no es trabajo del funcionario, es un asiento contable de traspaso.
 *
 * Ejemplo real (WILSON URIEL ORTEGA PEÑA, 001 Civil Municipal de Chiquinquirá,
 * 1 al 12 de enero de 2025):
 *
 *     categoría                          invIni  ingreso  egreso  invFin
 *     Movimiento de Tutelas                   3       -3       0       0
 *     Incidentes de Desacato                  2       -2       0       0
 *     Primera y única instancia Civil-Oral  283     -283       0       0
 *
 * Ese mismo inventario vuelve a entrar el 13 de enero bajo el código nuevo. Si
 * se cuentan los dos tramos, el inventario entra dos veces en la carga.
 *
 * El área indicó que el cálculo del código nuevo se hace **sobre los datos del
 * código nuevo**, dejando lo anterior registrado pero sin tomarlo en cuenta.
 * Las filas no se borran: siguen en la base y se pueden consultar.
 *
 * En producción son 9 tramos, todos del 1 al 12 de enero de 2025 —vacancia
 * judicial, cero días hábiles— y todos corresponden a los 9 juzgados que
 * cambiaron de código.
 */

export type FilaDeTramo = {
	funcionarioId: string | null;
	desde: Date;
	hasta: Date;
	ingresoEfectivo: number;
	egresoEfectivo: number;
	inventarioFinal: number;
};

const clave = (r: FilaDeTramo) =>
	[r.funcionarioId ?? '-', r.desde.toISOString().slice(0, 10), r.hasta.toISOString().slice(0, 10)].join('|');

/**
 * Un tramo es un asiento de cierre si no reporta ningún egreso, deja el
 * inventario final en cero y sus ingresos suman negativo.
 *
 * Las tres condiciones a la vez. Ninguna sobra:
 *
 * - **Sin egreso** — no se evacuó nada, así que no hubo trabajo que calificar.
 * - **Inventario final en cero** — el despacho quedó vacío: se traspasó todo.
 * - **Ingresos negativos** — es la salida del inventario. Un tramo sin
 *   actividad real tiene ingreso cero, no negativo; por eso este es el que
 *   distingue un traspaso de un periodo simplemente vacío, que sí se conserva.
 */
export const esAsientoDeCierre = (filasDelTramo: FilaDeTramo[]): boolean => {
	if (!filasDelTramo.length) return false;
	const sumar = (obtener: (r: FilaDeTramo) => number) => filasDelTramo.reduce((a, r) => a + obtener(r), 0);
	return sumar((r) => r.egresoEfectivo) === 0 && sumar((r) => r.inventarioFinal) === 0 && sumar((r) => r.ingresoEfectivo) < 0;
};

/**
 * Separa los registros de un despacho en los que entran al cálculo y los que
 * son asiento de cierre. Agrupa por funcionario y tramo de fechas, porque la
 * condición se cumple sobre el tramo entero, no fila por fila.
 */
export const descartarAsientosDeCierre = <T extends FilaDeTramo>(registros: T[]): { conservados: T[]; descartados: T[] } => {
	const porTramo = new Map<string, T[]>();
	for (const r of registros) {
		const k = clave(r);
		if (!porTramo.has(k)) porTramo.set(k, []);
		porTramo.get(k)!.push(r);
	}

	const conservados: T[] = [];
	const descartados: T[] = [];
	for (const filas of porTramo.values()) (esAsientoDeCierre(filas) ? descartados : conservados).push(...filas);

	// Se devuelven en el orden en que llegaron: el cálculo usa el primero y el
	// último para deducir el rango de días del despacho.
	const enOrden = (a: T, b: T) => a.desde.getTime() - b.desde.getTime();
	return { conservados: conservados.sort(enOrden), descartados: descartados.sort(enOrden) };
};
