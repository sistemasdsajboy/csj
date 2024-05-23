import { generarCalificacionFuncionario } from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/db/client';
import { countLaborDaysBetweenDates } from '$lib/utils/dates';
import { error } from '@sveltejs/kit';
import _ from 'lodash';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	const funcionario = await db.funcionario.findFirst({ where: { id: params.funcionarioId } });
	if (!funcionario) error(400, 'Funcionario no encontrado');

	const despachosPeriodoIds = await db.registroCalificacion.findMany({
		where: { funcionarioId: params.funcionarioId, periodo: 2023 },
		select: { despachoId: true },
		distinct: ['despachoId']
	});

	const despachosIds = _.map(despachosPeriodoIds, 'despachoId');
	const despachos = await db.despacho.findMany({ where: { id: { in: despachosIds } } });

	// Incluir en los registros de calificación todos datos de los despachos en los que trabajó el funcionario en el periodo.
	const registrosDespachos = await db.registroCalificacion.findMany({
		where: { despachoId: { in: despachosIds } }
	});

	const calificacion = await generarCalificacionFuncionario(
		registrosDespachos,
		funcionario,
		despachos
	);

	return { funcionario, calificacion, despacho: despachos[0].nombre };
}) satisfies PageServerLoad;

export const actions = {
	addNovedad: async ({ request, params }) => {
		try {
			const data = await request.formData();

			let type = data.get('type') as string;
			let from = new Date(data.get('from') as string);
			let to = new Date(data.get('to') as string);
			let notes = data.get('notes') as string;

			const days = countLaborDaysBetweenDates(from, to);

			await db.funcionario.update({
				where: { id: params.funcionarioId },
				data: { novedades: { push: { type, from, to, days, notes } } }
			});

			return { success: true };
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return { success: false, error: 'Ha ocurrido un error inesperado' };
		}
	}
};
