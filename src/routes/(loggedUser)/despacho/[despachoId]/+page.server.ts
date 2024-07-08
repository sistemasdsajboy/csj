import { db } from '$lib/db/client';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	const despacho = await db.despacho.findFirst({ where: { id: params.despachoId } });
	if (!despacho) error(404, 'Despacho no encontrado');

	const tiposDespacho = await db.tipoDespacho.findMany();
	const opcionesTipoDespacho = tiposDespacho.map(({ id, nombre }) => ({
		label: nombre,
		value: id
	}));

	return { despacho, opcionesTipoDespacho };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, params }) => {
		const formData = Object.fromEntries(await request.formData());

		const schema = z.object({
			numero: z.coerce.number(),
			tipoDespachoId: z.string(),
			municipio: z.string(),
			distrito: z.string()
		});

		const { success, data } = schema.safeParse(formData);
		if (!success) return { success: false, error: 'Datos no válidos' };

		await db.despacho.update({ where: { id: params.despachoId }, data });

		return { success: true };
	}
};
