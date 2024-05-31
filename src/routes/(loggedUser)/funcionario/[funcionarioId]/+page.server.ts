import { db } from '$lib/db/client';
import { error, redirect } from '@sveltejs/kit';
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

	if (despachos.length === 1)
		throw redirect(302, `/funcionario/${params.funcionarioId}/${despachos[0].id}`);

	return { funcionario, despachos };
}) satisfies PageServerLoad;
