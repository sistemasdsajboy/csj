import {
	buildRendimientoGrades,
	getDespachoFromFileData,
	getFileRawGradeData,
	getFuncionarios
} from '$lib/core/calificaciones';
import {
	createRegistroPorCalificar,
	getRegistroPorCalificarByDespacho,
	getRegistrosPorCalificar
} from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	return { records: await getRegistrosPorCalificar()  };
}) satisfies PageServerLoad;

export const actions = {
	loadFile: async ({ request }) => {
		try {
			const data = await request.formData();
			const file = data.get('file') as File;
			if (!file.name)
				return fail(400, { error: 'Debe seleccionar un archivo de calificaciones para iniciar.' });
			if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx'))
				return fail(400, { error: 'El archivo seleccionado debe tener extensión .xls o .xlsx' });

			const despacho = await getDespachoFromFileData(file);
			const registro = await getRegistroPorCalificarByDespacho(despacho);
			if (registro) return fail(400, { error: 'Ya existe un registro para este despacho' });

			const fileData = await getFileRawGradeData(file);
			const funcionarios = getFuncionarios(fileData);

			await createRegistroPorCalificar({ despacho, data: fileData, funcionarios });

			return { success: true };
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return { success: false, error: 'Ha ocurrido un error inesperado' };
		}
	},

	gradeData: async ({ request }) => {
		try {
			const data = await request.formData();

			let despacho = data.get('despacho') as string;
			const record = await getRegistroPorCalificarByDespacho(despacho);
			if (!record) return fail(400, { error: 'Registro no encontrado' });

			let funcionario =
				record.funcionarios.length > 1
					? (data.get('funcionario') as string)
					: record.funcionarios[0];

			if (!funcionario) return fail(400, { error: 'Funcionario no especificado' });

			const grades = buildRendimientoGrades(record.data, funcionario);

			return { success: true, ...grades, despacho, funcionario };
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return { success: false, error: 'Ha ocurrido un error inesperado' };
		}
	}
};
