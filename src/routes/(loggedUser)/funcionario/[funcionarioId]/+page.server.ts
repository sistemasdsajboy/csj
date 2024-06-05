import { generarCalificacionFuncionario } from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/db/client';
import { error, fail, redirect } from '@sveltejs/kit';
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

	return { funcionario, despachos };
}) satisfies PageServerLoad;

export const actions = {
	generarCalificacion: async ({ request, params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const form = await request.formData();

		const funcionarioId = params.funcionarioId;
		const despachoId = form.get('despachoId') as string;
		const periodo = parseInt(form.get('periodo') as string);

		if (!despachoId || !periodo || Number.isNaN(periodo))
			return fail(400, { error: 'Datos incompletos.' });

		await generarCalificacionFuncionario(funcionarioId, despachoId, periodo, locals.user.id);

		return redirect(302, `/funcionario/${params.funcionarioId}/${periodo}/${despachoId}`);
	}
};
