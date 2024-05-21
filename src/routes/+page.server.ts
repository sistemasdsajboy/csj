import {
	buildRendimientoGrades,
	getDespachoFromFileData,
	getFileRawGradeData,
	getFuncionarios
} from '$lib/core/calificaciones';
import { registroCalificacion } from '$lib/db/registro-calificacion';
import { countLaborDaysBetweenDates } from '$lib/utils/dates';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	return { registros: await registroCalificacion.getAll() };
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
			const registro = await registroCalificacion.getByDespacho(despacho);
			if (registro) return fail(400, { error: 'Ya existe un registro para este despacho' });

			const fileData = await getFileRawGradeData(file);
			const funcionarios = getFuncionarios(fileData);

			await registroCalificacion.create({ despacho, data: fileData, funcionarios });

			return { success: true };
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return { success: false, error: 'Ha ocurrido un error inesperado' };
		}
	},

	addNovedad: async ({ request }) => {
		try {
			const data = await request.formData();

			let registroId = data.get('registroId') as string;
			let type = data.get('type') as string;
			let from = new Date(data.get('from') as string);
			let to = new Date(data.get('to') as string);
			let notes = data.get('notes') as string;

			const days = countLaborDaysBetweenDates(from, to);

			await registroCalificacion.addNovedad(registroId, { type, from, to, days, notes });

			return { success: true };
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return { success: false, error: 'Ha ocurrido un error inesperado' };
		}
	},

	gradeData: async ({ request }) => {
		try {
			const data = await request.formData();

			let registroId = data.get('registroId') as string;
			const registro = await registroCalificacion.getById(registroId);
			if (!registro) return fail(400, { error: 'Registro no encontrado' });

			let funcionario =
				registro.funcionarios.length > 1
					? (data.get('funcionario') as string)
					: registro.funcionarios[0];

			if (!funcionario) return fail(400, { error: 'Funcionario no especificado' });

			const grades = buildRendimientoGrades(registro, funcionario);

			return {
				success: true,
				...grades,
				despacho: registro.despacho,
				funcionario
			};
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return { success: false, error: 'Ha ocurrido un error inesperado' };
		}
	}
};
