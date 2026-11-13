import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { PLANTILLA_BASE64 } from './plantilla';

/**
 * Llena la plantilla del formato de calificación integral (ver
 * scripts/plantilla-formato-integral.py) con el contenido que arma
 * `datosDocumento`. Devuelve el .docx listo para descargar.
 */
export function generarFormatoIntegral(datos: Record<string, unknown>): Buffer {
	const zip = new PizZip(Buffer.from(PLANTILLA_BASE64, 'base64'));
	const doc = new Docxtemplater(zip, {
		// Las marcas de bloque ({#secciones}, {#parrafos}) van solas en su párrafo y se quitan.
		paragraphLoop: true,
		linebreaks: true,
		// Un dato que falte deja la celda vacía, como en el formato en blanco.
		nullGetter: () => '',
	});
	doc.render(datos);
	return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** Nombre del archivo para Content-Disposition: versión ASCII y versión UTF-8 (RFC 6266). */
export function disposicionArchivo(nombre: string): string {
	const ascii = nombre
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9 ._()-]/g, '_');
	const utf8 = encodeURIComponent(nombre).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
	return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
