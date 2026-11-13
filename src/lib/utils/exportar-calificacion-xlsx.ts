import FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import type { CalificacionExportada, Celda } from '$lib/core/calificaciones/exportar-calificacion';

/**
 * Excel de la pantalla de una calificación: una hoja con todo en el mismo orden
 * de la pantalla. Las cifras quedan como números para poder operar con ellas;
 * las que la pantalla muestra con dos decimales llevan ese formato.
 */

type Fila = (string | number | null)[];

export function construirLibro(exp: CalificacionExportada): XLSX.WorkBook {
	const filas: Fila[] = [];
	const decimales: { r: number; c: number }[] = [];
	const agregar = (celdas: Celda[]) => {
		const r = filas.length;
		filas.push(
			celdas.map((celda, c) => {
				if (celda != null && typeof celda === 'object') {
					decimales.push({ r, c });
					return celda.decimal;
				}
				return celda;
			})
		);
	};

	agregar([exp.titulo]);
	agregar([]);
	for (const e of exp.encabezado) agregar([e.etiqueta, e.valor]);
	agregar([]);

	for (const s of exp.secciones) {
		agregar([s.titulo.toUpperCase()]);
		if (s.nota) agregar([s.nota]);
		if (s.tabla) {
			agregar(s.tabla.columnas);
			for (const f of s.tabla.filas) agregar(f);
		}
		if (s.valores?.length) {
			if (s.tabla) agregar([]);
			for (const v of s.valores) agregar([v.etiqueta, v.valor]);
		}
		agregar([]);
	}

	const hoja = XLSX.utils.aoa_to_sheet(filas);
	for (const { r, c } of decimales) {
		const celda = hoja[XLSX.utils.encode_cell({ r, c })];
		if (celda) celda.z = '0.00';
	}
	hoja['!cols'] = [{ wch: 42 }, ...Array.from({ length: 9 }, () => ({ wch: 16 }))];

	const libro = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(libro, hoja, 'Calificación');
	return libro;
}

export function descargarExcel(exp: CalificacionExportada) {
	const datos = XLSX.write(construirLibro(exp), { bookType: 'xlsx', type: 'array' });
	FileSaver.saveAs(
		new Blob([datos], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
		`${exp.nombreArchivo}.xlsx`
	);
}
