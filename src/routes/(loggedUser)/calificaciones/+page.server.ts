import { db } from '$lib/db/client';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	if (!locals.user) error(400, 'No autorizado');
	const user = await db.user.findFirst({ where: { id: locals.user?.id } });

	if (!user) error(400, 'Usuario no encontrado');
	const { roles, despachosSeccionalIds } = user;

	const calificaciones = await db.calificacion.findMany({
		where: {
			OR: [
				{ despachoSeccionalId: { in: despachosSeccionalIds } },
				{ despachoSeccionalId: { isSet: false } }
			],
			estado: {
				in: roles.includes('editor')
					? ['aprobada', 'revision', 'borrador']
					: ['aprobada', 'revision']
			}
		},
		select: {
			id: true,
			estado: true,
			funcionario: { select: { nombre: true } },
			despacho: { select: { nombre: true } },
			despachoSeccional: { select: { nombre: true } }
		},
		orderBy: { funcionario: { nombre: 'asc' } }
	});

	const despachos = await db.despachoSeccional.findMany({
		orderBy: { nombre: 'asc' }
	});

	return { calificaciones, despachos };
}) satisfies PageServerLoad;

export const actions = {
	actualizarDespacho: async ({ request, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const formData = await request.formData();
		const calificacionId = formData.get('calificacionId') as string;

		const calificacion = await db.calificacion.findFirst({
			where: { id: calificacionId }
		});
		if (!calificacion) return fail(400, { error: 'Calificación no encontrada.' });

		const despachoId = formData.get('despachoId') as string;
		if (!despachoId) return fail(400, { error: 'Debe seleccionar un despacho' });

		await db.calificacion.update({
			where: { id: calificacionId },
			data: { despachoSeccionalId: despachoId }
		});

		throw redirect(302, '/calificaciones');
	}
};
