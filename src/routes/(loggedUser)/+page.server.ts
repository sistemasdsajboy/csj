import { createRegistrosCalificacionFromXlsx } from '$lib/core/calificaciones/carga-xlsx';
import { db } from '$lib/db/client';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const funcionarios = await db.funcionario.findMany({
		orderBy: { nombre: 'asc' }
	});

	return { funcionarios };
}) satisfies PageServerLoad;

export const actions = {
	loadFile: async ({ request, locals }) => {
		try {
			if (!locals.user) return fail(401, { message: 'No autorizado' });

			const data = await request.formData();
			const file = data.get('file') as File;
			if (!file.name)
				return fail(400, { error: 'Debe seleccionar un archivo de calificaciones para iniciar.' });
			if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx'))
				return fail(400, { error: 'El archivo seleccionado debe tener extensión .xls o .xlsx' });

			await createRegistrosCalificacionFromXlsx(file);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: 'Ha ocurrido un error inesperado durante la carga del archivo.'
			};
		}
	}
};
