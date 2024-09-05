import { consultarDespachosPorFuncionario, generarCalificacionFuncionario } from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/server/db-client';
import { error, fail, redirect } from '@sveltejs/kit';
import _ from 'lodash';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, url }) => {
	const funcionario = await db.funcionario.findFirst({ where: { id: params.funcionarioId } });
	if (!funcionario) error(400, 'Funcionario no encontrado');

	const registrosPeriodos = await db.registroCalificacion.findMany({
		where: { funcionarioId: params.funcionarioId },
		orderBy: { periodo: 'desc' },
		select: { periodo: true },
		distinct: ['periodo'],
	});
	const periodos = _.map(registrosPeriodos, 'periodo');

	const periodo = url.searchParams.get('periodo') ?? periodos[0]?.toString();

	const despachos = await consultarDespachosPorFuncionario(funcionario.id, parseInt(periodo));

	return { funcionario, periodos, periodo, despachos };
}) satisfies PageServerLoad;

export const actions = {
	generarCalificacion: async ({ request, params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const form = await request.formData();

		const funcionarioId = params.funcionarioId;
		const periodo = parseInt(form.get('periodo')?.toString() ?? '');

		if (!periodo || Number.isNaN(periodo)) return fail(400, { error: 'Datos incompletos.' });

		let calificacionId: string;
		try {
			calificacionId = await generarCalificacionFuncionario(funcionarioId, periodo);
		} catch (error) {
			return fail(400, { error: error instanceof Error ? error.message : '' });
		}

		return redirect(302, `/calificacion/${calificacionId}`);
	},
};
