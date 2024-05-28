import { db } from '$lib/db/client';
import { CategoriaDespacho, EspecialidadDespacho } from '@prisma/client';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	const despacho = await db.despacho.findFirst({ where: { id: params.despachoId } });
	if (!despacho) error(404, 'Despacho no encontrado');

	return { despacho };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, params }) => {
		const formData = Object.fromEntries(await request.formData());

		const schema = z.object({
			numero: z.coerce.number(),
			especialidad: z.nativeEnum(EspecialidadDespacho),
			categoria: z.nativeEnum(CategoriaDespacho),
			municipio: z.string(),
			distrito: z.string()
		});

		const { success, data } = schema.safeParse(formData);
		if (!success) return { success: false, error: 'Datos no válidas' };

		await db.despacho.update({ where: { id: params.despachoId }, data });

		return { success: true };
	}
};
