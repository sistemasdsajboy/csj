import { db } from '$lib/db/client';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	if (!locals.user) error(400, 'No autorizado');
	const user = await db.user.findFirst({ where: { id: locals.user?.id } });

	if (!user) error(400, 'Usuario no encontrado');
	const { roles, despachosSeccionalIds } = user;

	const calificaciones = await db.calificacionPeriodo.findMany({
		where: {
			OR: [
				{ despachoSeccionalId: { in: despachosSeccionalIds } },
				{ despachoSeccionalId: { isSet: false } }
			],
			estado: {
				in: roles.includes('editor')
					? ['aprobada', 'revision', 'borrador', 'devuelta']
					: ['aprobada', 'revision', 'devuelta']
			}
		},
		select: {
			id: true,
			estado: true,
			funcionario: { select: { nombre: true } },
			calificaciones: { select: { despacho: { select: { nombre: true } } } },
			despachoSeccional: { select: { nombre: true } }
		},
		orderBy: { funcionario: { nombre: 'asc' } }
	});

	return { calificaciones };
}) satisfies PageServerLoad;
