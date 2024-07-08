import { CategoriaDespacho, EspecialidadDespacho } from '@prisma/client';
import type { PageServerLoad } from './$types';
import { z } from 'zod';
import { db } from '$lib/db/client';

export const load = (async () => {
	const tiposDespacho = await db.tipoDespacho.findMany({ orderBy: { nombre: 'asc' } });
	const especialidades = Object.values(EspecialidadDespacho).map((e) => ({ label: e, value: e }));
	const categorias = Object.values(CategoriaDespacho).map((e) => ({ label: e, value: e }));

	return { tiposDespacho, especialidades, categorias };
}) satisfies PageServerLoad;

const tipoDespachoSchema = z.object({
	nombre: z.string().min(15).max(80),
	especialidad: z.nativeEnum(EspecialidadDespacho),
	categoria: z.nativeEnum(CategoriaDespacho)
});

export const actions = {
	guardarTipoDespacho: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const nombre = formData.get('nombre') as string;
		const especialidad = formData.get('especialidad') as string;
		const categoria = formData.get('categoria') as string;

		const { success, data } = tipoDespachoSchema.safeParse({ id, nombre, especialidad, categoria });
		if (!success) return { success: false, error: 'Datos de tipo de despacho no válidos' };

		try {
			if (id) await db.tipoDespacho.update({ where: { id }, data });
			else await db.tipoDespacho.create({ data });
		} catch (error) {
			return { success: false, error: 'Error al guardar los datos del tipo de despacho.' };
		}

		return { success: true, mensaje: 'Tipo de despacho guardado' };
	}
};
