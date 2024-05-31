import {
	generarCalificacionFuncionario,
	getDiasFestivosPorDespacho
} from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/db/client';
import { countLaborDaysBetweenDates } from '$lib/utils/dates';
import { error, fail, redirect } from '@sveltejs/kit';
import _ from 'lodash';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	if (!locals.user) error(400, 'No autorizado');

	const funcionario = await db.funcionario.findFirst({ where: { id: params.funcionarioId } });
	if (!funcionario) error(400, 'Funcionario no encontrado');

	const despacho = await db.despacho.findFirst({ where: { id: params.despachoId } });
	if (!despacho) error(400, 'Despacho no encontrado');

	const calificacion = await db.calificacion.findFirst({
		where: { funcionarioId: funcionario.id, despachoId: despacho.id, periodo: 2023 }
	});
	if (!calificacion) return { funcionario, despacho, calificacion, otrosFuncionarios: [] };

	const despachosPeriodoIds = await db.registroCalificacion.findMany({
		where: { funcionarioId: params.funcionarioId, periodo: 2023 },
		select: { despachoId: true },
		distinct: ['despachoId']
	});
	const despachosIds = _.map(despachosPeriodoIds, 'despachoId');
	const despachos = await db.despacho.findMany({ where: { id: { in: despachosIds } } });
	if (!despachos) error(400, 'Despachos no encontrados');

	// const funcionariosIds = _.uniqBy(calificacion. , 'funcionarioId').map((r) => r.funcionarioId);
	// const otrosFuncionarios = await db.funcionario.findMany({
	// 	where: { id: { in: funcionariosIds } },
	// 	select: { id: true, nombre: true }
	// });

	return { funcionario, despachos, despacho, calificacion, otrosFuncionarios: [] };
}) satisfies PageServerLoad;

export const actions = {
	calificar: async ({ params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const registrosDespachos = await db.registroCalificacion.findMany({
			where: { despachoId: params.despachoId, periodo: 2023 }
		});

		const funcionario = await db.funcionario.findFirst({ where: { id: params.funcionarioId } });
		if (!funcionario) return fail(400, { error: 'Funcionario no encontrado' });

		const despacho = await db.despacho.findFirst({ where: { id: params.despachoId } });
		if (!despacho) return fail(400, { error: 'Despacho no encontrado' });

		await generarCalificacionFuncionario(
			registrosDespachos,
			funcionario,
			despacho,
			2023,
			locals.user.id
		);

		return redirect(302, `/funcionario/${params.funcionarioId}/${params.despachoId}`);
	},

	addNovedad: async ({ request, params }) => {
		try {
			const data = await request.formData();

			const despachoId = data.get('despacho') as string;
			const type = data.get('type') as string;
			const from = new Date(data.get('from') as string);
			const to = new Date(data.get('to') as string);
			const notes = data.get('notes') as string;

			const despacho = await db.despacho.findFirst({ where: { id: despachoId } });
			if (!despacho) return fail(404, { error: 'Despacho no encontrado' });

			const diasNoHabiles = getDiasFestivosPorDespacho(despacho);
			const days = countLaborDaysBetweenDates(diasNoHabiles, from, to);

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
