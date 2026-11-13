import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { comoTexto, type CalificacionExportada, type Valor } from '$lib/core/calificaciones/exportar-calificacion';

/**
 * PDF de la pantalla de una calificación: horizontal, con las mismas secciones
 * y en el mismo orden. Se genera en el navegador; el texto queda seleccionable.
 */

const MARGEN = 12;
const GRIS: [number, number, number] = [241, 245, 249];
const TEXTO: [number, number, number] = [30, 41, 59];
const RESALTADO: [number, number, number] = [7, 89, 133];

const finalY = (doc: jsPDF) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

export function construirPdf(exp: CalificacionExportada): jsPDF {
	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
	const alto = doc.internal.pageSize.getHeight();
	const ancho = doc.internal.pageSize.getWidth();
	const margin = { left: MARGEN, right: MARGEN, top: MARGEN, bottom: 14 };

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(15);
	doc.setTextColor(...TEXTO);
	doc.text(exp.titulo, MARGEN, MARGEN + 4);

	// Encabezado en dos columnas de pares etiqueta / valor.
	const pares: string[][] = [];
	for (let i = 0; i < exp.encabezado.length; i += 2) {
		const [a, b] = [exp.encabezado[i], exp.encabezado[i + 1]];
		pares.push([a.etiqueta, comoTexto(a.valor), b?.etiqueta ?? '', b ? comoTexto(b.valor) : '']);
	}
	autoTable(doc, {
		startY: MARGEN + 8,
		body: pares,
		theme: 'plain',
		margin,
		styles: { fontSize: 9, cellPadding: 1, textColor: TEXTO },
		columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 }, 2: { fontStyle: 'bold', cellWidth: 45 } },
	});
	let y = finalY(doc) + 5;

	for (const s of exp.secciones) {
		// Que el título no quede solo al pie de una página.
		if (y > alto - 35) {
			doc.addPage();
			y = MARGEN;
		}
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(12);
		doc.setTextColor(...TEXTO);
		doc.text(s.titulo, MARGEN, y + 4);
		y += 7;

		if (s.nota) {
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(9);
			const lineas = doc.splitTextToSize(s.nota, ancho - 2 * MARGEN);
			doc.text(lineas, MARGEN, y + 3);
			y += lineas.length * 4 + 2;
		}

		if (s.tabla) {
			autoTable(doc, {
				startY: y,
				head: [s.tabla.columnas],
				body: s.tabla.filas.map((f) => f.map(comoTexto)),
				theme: 'grid',
				margin,
				styles: { fontSize: 8, cellPadding: 1.5, textColor: TEXTO, lineColor: [226, 232, 240] },
				headStyles: { fillColor: GRIS, textColor: TEXTO, fontStyle: 'bold', halign: 'center' },
				// La primera columna (nombre o tipo) y las observaciones se leen mejor alineadas a la izquierda.
				columnStyles: Object.fromEntries(
					s.tabla.columnas.map((col, i) => [i, { halign: i === 0 || col === 'Observaciones' ? 'left' : 'center' }])
				),
			});
			y = finalY(doc) + 3;
		}

		if (s.valores?.length) {
			// Como las tarjetas de la pantalla: etiquetas arriba, cifras abajo.
			const v: Valor[] = s.valores;
			autoTable(doc, {
				startY: y,
				head: [v.map((x) => x.etiqueta)],
				body: [v.map((x) => comoTexto(x.valor))],
				theme: 'grid',
				margin,
				styles: { fontSize: 8, cellPadding: 2, halign: 'center', valign: 'middle', textColor: TEXTO, lineColor: [226, 232, 240] },
				headStyles: { fillColor: GRIS, textColor: TEXTO, fontStyle: 'normal' },
				bodyStyles: { fontSize: 11, fontStyle: 'bold' },
				didParseCell: (d) => {
					if (d.section === 'body' && v[d.column.index]?.resaltado) {
						d.cell.styles.textColor = RESALTADO;
						d.cell.styles.fontSize = 13;
					}
				},
			});
			y = finalY(doc) + 3;
		}
		y += 3;
	}

	// Pie de página: de dónde sale y número de página.
	const paginas = doc.getNumberOfPages();
	const generado = exp.encabezado.find((e) => e.etiqueta === 'Generado');
	for (let i = 1; i <= paginas; i++) {
		doc.setPage(i);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(100, 116, 139);
		doc.text(`Sistema de Calificaciones · generado el ${generado ? comoTexto(generado.valor) : ''}`, MARGEN, alto - 7);
		doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 7, { align: 'right' });
	}
	return doc;
}

export const descargarPdf = (exp: CalificacionExportada) => construirPdf(exp).save(`${exp.nombreArchivo}.pdf`);
