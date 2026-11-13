import { datosDocumento } from '$lib/core/calificaciones/integral/documento';
import { cargarEntrada } from '$lib/server/formato-integral/entrada';
import { disposicionArchivo, generarFormatoIntegral } from '$lib/server/formato-integral/generar';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Descarga el formato de calificación integral en Word, con lo último que se
 * guardó. En revisión sale marcado como borrador; aprobada, sale completo.
 */
export const GET: RequestHandler = async ({ params }) => {
	const { cp, entrada } = await cargarEntrada(params.calificacionId);
	if (cp.estado !== 'revision' && cp.estado !== 'aprobada')
		error(400, 'El formato se descarga mientras la calificación está en revisión (borrador) o cuando ya está aprobada.');

	const borrador = cp.estado !== 'aprobada';
	const archivo = generarFormatoIntegral({ ...datosDocumento(entrada), borrador });
	const nombre = `Calificacion integral ${cp.periodo} - ${entrada.funcionario.apellidos} ${entrada.funcionario.nombres}${borrador ? ' (borrador)' : ''}.docx`;

	return new Response(new Uint8Array(archivo), {
		headers: {
			'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'content-disposition': disposicionArchivo(nombre),
			'cache-control': 'private, no-store',
		},
	});
};
