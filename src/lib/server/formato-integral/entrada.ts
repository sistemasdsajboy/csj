import { datosDelFuncionario, datosEficiencia } from '$lib/core/calificaciones/integral/datos';
import type { EntradaDocumento, Firmas } from '$lib/core/calificaciones/integral/documento';
import { db } from '$lib/server/db-client';
import { error } from '@sveltejs/kit';

/** Con textos predeterminados solo el despacho 2: el despacho 1 aún digita la motivación a mano. */
export const usaTextosPredeterminados = (numeroDespacho: number | null | undefined) => numeroDespacho === 2;

/** Ponente del despacho que califica y presidente, como están configurados hoy (Configuración → Firmas). */
export async function firmasConfiguradas(despachoSeccionalId: string | null | undefined): Promise<Firmas> {
	const [despacho, firmas] = await Promise.all([
		despachoSeccionalId ? db.despachoSeccional.findFirst({ where: { id: despachoSeccionalId }, select: { ponente: true } }) : null,
		db.firmasCalificacion.findFirst({ select: { presidente: true } }),
	]);
	return { ponente: despacho?.ponente?.trim() || null, presidente: firmas?.presidente?.trim() || null };
}

/**
 * Lo que necesita el formato de calificación integral de una calificación:
 * los datos del sistema (funcionario, factor eficiencia) y lo digitado.
 * Responde 404 si no existe y 400 si aún no tiene factor eficiencia generado.
 */
export async function cargarEntrada(calificacionId: string) {
	const cp = await db.calificacionPeriodo.findFirst({ where: { id: calificacionId }, include: { despachoSeccional: true } });
	if (!cp) error(404, 'Calificación no encontrada');
	if (!(await db.calificacionDespacho.count({ where: { calificacionId: cp.id } })))
		error(400, 'La calificación aún no se ha generado: no hay factor eficiencia para el formato.');

	const [funcionario, eficiencia] = await Promise.all([datosDelFuncionario(cp.funcionarioId), datosEficiencia(cp.id)]);
	const entrada: EntradaDocumento = {
		periodo: cp.periodo,
		funcionario: { nombres: funcionario.nombres, apellidos: funcionario.apellidos, cedula: funcionario.cedula, genero: funcionario.genero },
		eficiencia,
		integral: cp.integral,
		textosPredeterminados: usaTextosPredeterminados(cp.despachoSeccional?.numero),
		// Aprobada, las firmas quedan como se guardaron; en revisión se compara con la configuración.
		firmasConfiguradas: cp.estado === 'revision' ? await firmasConfiguradas(cp.despachoSeccionalId) : undefined,
	};
	return { cp, funcionario, eficiencia, entrada };
}
