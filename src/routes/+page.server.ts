import {
	buildRendimientoGrades,
	getDespachoFromFileData,
	getFileRawGradeData,
	getFuncionarios
} from '$lib/core/calificaciones';
import {
	addNovedadToRegistroCalificacion,
	createRegistroCalificacion,
	getRegistroCalificacionByDespacho,
	getRegistroCalificacionById,
	getRegistrosCalificacion
} from '$lib/db';
import { countLaborDaysBetweenDates } from '$lib/utils/dates';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	return { registros: await getRegistrosCalificacion() };
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
			const registro = await getRegistroCalificacionByDespacho(despacho);
			if (registro) return fail(400, { error: 'Ya existe un registro para este despacho' });

			const fileData = await getFileRawGradeData(file);
			const funcionarios = getFuncionarios(fileData);

			await createRegistroCalificacion({ despacho, data: fileData, funcionarios });

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

			await addNovedadToRegistroCalificacion(registroId, { type, from, to, days, notes });

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
			const record = await getRegistroCalificacionById(registroId);
			if (!record) return fail(400, { error: 'Registro no encontrado' });

			let funcionario =
				record.funcionarios.length > 1
					? (data.get('funcionario') as string)
					: record.funcionarios[0];

			if (!funcionario) return fail(400, { error: 'Funcionario no especificado' });

			const diasDescontados = record.novedades
				? record.novedades.reduce((dias, novedad) => {
						return dias + novedad.days;
					}, 0)
				: 0;

			const grades = buildRendimientoGrades(record.data, diasDescontados, funcionario);

			return { success: true, ...grades, despacho: record.despacho, funcionario, diasDescontados };
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return { success: false, error: 'Ha ocurrido un error inesperado' };
		}
	}
};
