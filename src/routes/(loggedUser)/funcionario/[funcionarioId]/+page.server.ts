import { generarCalificacionFuncionario } from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/db/client';
import { countLaborDaysBetweenDates } from '$lib/utils/dates';
import { error } from '@sveltejs/kit';
import _ from 'lodash';
import { z } from 'zod';
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

	return { funcionario, calificacion, despachos };
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
	},

	addRegistroAudiencias: async ({ request, params }) => {
		const formData = Object.fromEntries(await request.formData());

		const registroAudienciaSchema = z.object({
			despachoId: z.string(),
			periodo: z.coerce.number().default(2023),
			programadas: z.coerce.number(),
			atendidas: z.coerce.number(),
			aplazadasAjenas: z.coerce.number(),
			aplazadasJustificadas: z.coerce.number(),
			aplazadasNoJustificadas: z.coerce.number()
		});

		const { success, data } = registroAudienciaSchema.safeParse(formData);
		if (!success) return { success: false, error: 'Datos de registro no válidos' };

		const existente = await db.registroAudiencias.findFirst({
			where: { despachoId: data.despachoId, periodo: data.periodo }
		});
		if (existente)
			return {
				success: false,
				error: `Ya existe un registro de ${data.periodo} para este despacho.`
			};

		await db.registroAudiencias.create({ data });

		return { success: true };
	}
};
