import {
	generarCalificacionFuncionario,
	getDiasFestivosPorDespacho
} from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/db/client';
import { countLaborDaysBetweenDates } from '$lib/utils/dates';
import { error, fail } from '@sveltejs/kit';
import _ from 'lodash';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	if (!locals.user) error(400, 'No autorizado');

	const calificacion = await db.calificacion.findFirst({
		where: {
			funcionarioId: params.funcionarioId,
			despachoId: params.despachoId,
			periodo: parseInt(params.periodo)
		},
		include: {
			registrosConsolidados: true,
			subfactores: true,
			despacho: true,
			funcionario: true,
			registroAudiencias: true
		}
	});

	if (!calificacion) error(404, 'Calificación no encontrada');

	const funcionariosIds = _(calificacion.registrosConsolidados)
		.uniqBy('funcionarioId')
		.map((r) => r.funcionarioId)
		.value();
	const otrosFuncionarios = await db.funcionario.findMany({
		where: { id: { in: funcionariosIds } },
		select: { id: true, nombre: true }
	});

	const consolidadoOrdinario = calificacion.registrosConsolidados.filter((r) => r.clase === 'oral');
	const consolidadoTutelas = calificacion.registrosConsolidados.filter(
		(r) => r.clase === 'constitucional'
	);
	const consolidadoGarantias = calificacion.registrosConsolidados.filter(
		(r) => r.clase === 'garantias'
	);
	const consolidadoEscrito = calificacion.registrosConsolidados.filter(
		(r) => r.clase === 'escrito'
	);
	const oral = calificacion.subfactores.find((s) => s.subfactor === 'oral');
	const garantias = calificacion.subfactores.find((s) => s.subfactor === 'garantias');

	return {
		calificacion,
		despacho: calificacion.despacho,
		funcionario: calificacion.funcionario,
		otrosFuncionarios,
		consolidadoOrdinario,
		consolidadoTutelas,
		consolidadoGarantias,
		consolidadoEscrito,
		oral,
		garantias
	};
}) satisfies PageServerLoad;

export const actions = {
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

	addRegistroAudiencias: async ({ request, params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

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

		const { success, data } = registroAudienciaSchema.safeParse({
			despachoId: params.despachoId,
			...formData
		});

		if (!success) return { success: false, error: 'Datos de registro no válidos' };

		const calificacion = await db.calificacion.findFirst({
			where: {
				funcionarioId: params.funcionarioId,
				despachoId: data.despachoId,
				periodo: data.periodo
			}
		});
		if (calificacion && calificacion?.estado !== 'borrador')
			throw new Error('La calificación ya no es un borrador y no puede modificarse.');

		if (
			data.programadas !==
			data.atendidas +
				data.aplazadasAjenas +
				data.aplazadasJustificadas +
				data.aplazadasNoJustificadas
		)
			return {
				success: false,
				error:
					'La suma de las audiencias atendidas y aplazadas debe ser igual al número de audiencias programadas.'
			};

		const existente = await db.registroAudiencias.findFirst({
			where: { despachoId: data.despachoId, periodo: data.periodo }
		});

		if (existente) await db.registroAudiencias.update({ where: { id: existente.id }, data });
		else await db.registroAudiencias.create({ data });

		await generarCalificacionFuncionario(
			params.funcionarioId,
			data.despachoId,
			data.periodo,
			locals.user.id
		);

		return { success: true };
	}
};
