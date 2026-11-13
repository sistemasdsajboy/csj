import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import type { CalificacionExportada } from '$lib/core/calificaciones/exportar-calificacion';
import { construirPdf } from './exportar-calificacion-pdf';
import { construirLibro } from './exportar-calificacion-xlsx';

const exp: CalificacionExportada = {
	titulo: 'Calificación del factor eficiencia o rendimiento',
	nombreArchivo: 'Calificacion 2025 - PRUEBA - 1',
	encabezado: [
		{ etiqueta: 'Funcionario', valor: 'FUNCIONARIO DE PRUEBA' },
		{ etiqueta: 'Periodo', valor: 2025 },
		{ etiqueta: 'Generado', valor: '12/11/2026 09:05' },
	],
	secciones: [
		{ titulo: 'Totales', valores: [{ etiqueta: 'Calificación factor eficiencia', valor: { decimal: 37.2 }, resaltado: true }] },
		{ titulo: 'Novedades', nota: 'Sin novedades registradas en el periodo' },
		{
			titulo: 'Oral',
			tabla: { columnas: ['Funcionario', 'Carga efectiva'], filas: [['FUNCIONARIO DE PRUEBA', 150]] },
			valores: [{ etiqueta: 'Carga proporcional', valor: { decimal: 148.25 } }],
		},
	],
};

describe('PDF de la calificación', () => {
	it('se genera, horizontal, con el texto de cada sección', () => {
		const doc = construirPdf(exp);
		expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
		const pdf = doc.output();
		expect(pdf.startsWith('%PDF-')).toBe(true);
		for (const t of ['Totales', 'Novedades', 'Oral', '37.20', '148.25', 'Sin novedades registradas en el periodo', 'Página 1 de 1'])
			expect(pdf).toContain(t);
	});
});

describe('Excel de la calificación', () => {
	it('una hoja en el orden de la pantalla, con números y dos decimales donde corresponde', () => {
		const libro = XLSX.read(XLSX.write(construirLibro(exp), { bookType: 'xlsx', type: 'array' }), { type: 'array', cellNF: true });
		expect(libro.SheetNames).toEqual(['Calificación']);
		const hoja = libro.Sheets['Calificación'];
		const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, blankrows: false });
		expect(filas[0]).toEqual(['Calificación del factor eficiencia o rendimiento']);
		expect(filas).toContainEqual(['Calificación factor eficiencia', 37.2]);
		expect(filas).toContainEqual(['FUNCIONARIO DE PRUEBA', 150]);
		// La cifra decimal lleva el formato de dos decimales; la entera, no.
		const celda = (v: number) => Object.values(hoja).find((c) => (c as XLSX.CellObject)?.v === v) as XLSX.CellObject;
		expect(celda(37.2).z).toBe('0.00');
		expect(celda(150).z).not.toBe('0.00');
	});
});
