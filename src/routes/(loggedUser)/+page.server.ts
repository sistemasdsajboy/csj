import { createRegistrosCalificacionFromXlsx } from '$lib/core/calificaciones/carga-xlsx';
import { db } from '$lib/db/client';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	const funcionarios = await db.funcionario.findMany({
		orderBy: { nombre: 'asc' }
	});

	return { funcionarios };
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
