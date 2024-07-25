import { createRegistrosCalificacionFromXlsx } from '$lib/core/calificaciones/carga-xlsx';
import { db } from '$lib/db/client';
import type { EstadoCalificacion } from '@prisma/client';
import { error, fail } from '@sveltejs/kit';
import _ from 'lodash';
import type { PageServerLoad } from './$types';

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

	const funcionarios = (
		await db.funcionario.findMany({
			orderBy: { nombre: 'asc' }
		})
	).map((f) => ({ label: f.nombre, value: f.id }));

	return {
		estadoPorDefecto,
		estados,
		cuentaPorEstado,
		despachosCalificadores,
		calificaciones,
		funcionarios
	};
}) satisfies PageServerLoad;

export const actions = {
	loadFile: async ({ request, locals }) => {
		try {
			if (!locals.user) return fail(401, { error: 'Usuario no autorizado' });

			const data = await request.formData();
			const file = data.get('file') as File;
			if (!file.name)
				return fail(400, { error: 'Debe seleccionar un archivo de calificaciones para iniciar.' });
			if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx'))
				return fail(400, { error: 'El archivo seleccionado debe tener extensión .xls o .xlsx' });

			const registrosCargados = await createRegistrosCalificacionFromXlsx(file);
			return { success: true, message: `Archivo cargado. ${registrosCargados} registros creados.` };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : '' };
		}
	}
};
