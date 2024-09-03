import { db } from '$lib/server/db-client';
import { CategoriaDespacho, EspecialidadDespacho } from '@prisma/client';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	const tiposDespacho = await db.tipoDespacho.findMany({
		include: { capacidadesMaximas: true },
		orderBy: { nombre: 'asc' }
	});
	const especialidades = Object.values(EspecialidadDespacho).map((e) => ({ label: e, value: e }));
	const categorias = Object.values(CategoriaDespacho).map((e) => ({ label: e, value: e }));

	return { tiposDespacho, especialidades, categorias };
}) satisfies PageServerLoad;

const tipoDespachoSchema = z.object({
	nombre: z.string().min(15).max(80),
	especialidad: z.nativeEnum(EspecialidadDespacho),
	categoria: z.nativeEnum(CategoriaDespacho)
});

const capacidadMaximaSchema = z.object({
	tipoDespachoId: z.string(),
	periodo: z.coerce.number().min(2020).max(2029),
	cantidad: z.coerce.number().min(1)
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

		return { success: true };
	},

	guardarCapacidadMaxima: async ({ request }) => {
		const formData = await request.formData();
		const tipoDespachoId = formData.get('tipoDespachoId') as string;
		const cantidad = formData.get('cantidad') as string;
		const periodo = formData.get('periodo') as string;

		const { success, data } = capacidadMaximaSchema.safeParse({
			tipoDespachoId,
			cantidad,
			periodo
		});
		if (!success) return { success: false, error: 'Datos inválidos' };

		const existente = await db.capacidadMaximaRespuesta.findFirst({
			where: { tipoDespachoId, periodo: data.periodo },
			include: { tipoDespacho: true }
		});

		if (existente)
			return {
				success: false,
				error: `Ya existe una capacidad máxima de respuesta para el tipo de despacho "${existente.tipoDespacho.nombre}" en el periodo ${data.periodo}.`
			};

		try {
			await db.capacidadMaximaRespuesta.create({ data });
		} catch (error) {
			return { success: false, error: 'Error al guardar los datos de la capacidad máxima.' };
		}

		return { success: true };
	}
};
