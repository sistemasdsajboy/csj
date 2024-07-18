import { db } from '$lib/db/client';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { EstadoCalificacion } from '@prisma/client';
import _ from 'lodash';

export const load = (async ({ locals }) => {
	if (!locals.user) error(400, 'No autorizado');
	const user = await db.user.findFirst({ where: { id: locals.user?.id } });

	if (!user) error(400, 'Usuario no encontrado');
	const { roles, despachosSeccionalIds } = user;

	const estadoPorDefecto: EstadoCalificacion = roles.includes('editor') ? 'borrador' : 'revision';
	const estados: EstadoCalificacion[] = roles.includes('editor')
		? ['borrador', 'devuelta', 'revision', 'aprobada']
		: ['devuelta', 'revision', 'aprobada'];

	const calificaciones = await db.calificacionPeriodo.findMany({
		where: {
			OR: [
				{ despachoSeccionalId: { in: despachosSeccionalIds } },
				{ despachoSeccionalId: { isSet: false } }
			],
			estado: { in: estados }
		},
		select: {
			id: true,
			estado: true,
			funcionario: { select: { nombre: true } },
			calificaciones: { select: { despacho: { select: { nombre: true } } } },
			despachoSeccional: { select: { id: true, nombre: true } }
		},
		orderBy: { funcionario: { nombre: 'asc' } }
	});

	const cuentaPorEstado = _.countBy(calificaciones, 'estado');

	const despachosSeccional = await db.despachoSeccional.findMany({
		where: { id: { in: despachosSeccionalIds } },
		select: { id: true, nombre: true }
	});
	const despachosCalificadores = [
		{ label: 'Todos los despachos', value: 'todos' },
		...despachosSeccional.map((d) => ({ label: d.nombre, value: d.id }))
	];

	return { estadoPorDefecto, estados, cuentaPorEstado, despachosCalificadores, calificaciones };
}) satisfies PageServerLoad;
