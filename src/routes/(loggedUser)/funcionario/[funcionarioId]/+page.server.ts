import { generarCalificacionFuncionario } from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/db/client';
import { error, fail, redirect } from '@sveltejs/kit';
import _ from 'lodash';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	const funcionario = await db.funcionario.findFirst({ where: { id: params.funcionarioId } });
	if (!funcionario) error(400, 'Funcionario no encontrado');

	const registrosPeriodos = await db.registroCalificacion.findMany({
		where: { funcionarioId: params.funcionarioId },
		select: { periodo: true },
		distinct: ['periodo'],
	});
	const periodos = _.map(registrosPeriodos, 'periodo');

	const despachosPeriodos = await db.registroCalificacion.findMany({
		where: { funcionarioId: params.funcionarioId },
		select: { despacho: true, periodo: true },
		distinct: ['despachoId'],
	});

	return { funcionario, periodos, despachosPeriodos };
}) satisfies PageServerLoad;

export const actions = {
	generarCalificacion: async ({ request, params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const form = await request.formData();

		const funcionarioId = params.funcionarioId;
		const despachoId = form.get('despachoId') as string;
		const periodo = parseInt(form.get('periodo') as string);

		if (!despachoId || !periodo || Number.isNaN(periodo)) return fail(400, { error: 'Datos incompletos.' });

		let calificacionId: string;
		try {
			calificacionId = await generarCalificacionFuncionario(funcionarioId, despachoId, periodo);
		} catch (error) {
			return fail(400, { error: error instanceof Error ? error.message : '' });
		}
		return redirect(302, `/calificacion/${calificacionId}?despacho=${despachoId}`);
	},
};
