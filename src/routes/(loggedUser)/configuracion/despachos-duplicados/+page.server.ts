import { fusionarJuzgado, planesDeFusion } from '$lib/core/calificaciones/fusionar-despachos';
import { db } from '$lib/server/db-client';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Unificación de juzgados partidos por un cambio de código.
 *
 * Estaba solo en `scripts/fusionar-despachos.mjs`, lo que obligaba a apuntar
 * una cadena de conexión con permiso de escritura contra la base del Consejo
 * desde un portátil. Aquí queda con las mismas comprobaciones, restringido a
 * administradores y con registro de quién lo hizo.
 */

const soloAdmin = async (locals: App.Locals) => {
	if (!locals.user) error(401, 'No autorizado');
	const user = await db.user.findFirst({ where: { id: locals.user.id } });
	if (!user?.roles.includes('admin')) error(403, 'Solo un administrador puede unificar despachos.');
	return user;
};

export const load = (async ({ locals }) => {
	await soloAdmin(locals);
	return { planes: await planesDeFusion() };
}) satisfies PageServerLoad;

export const actions = {
	fusionar: async ({ request, locals }) => {
		await soloAdmin(locals);

		const nombre = (await request.formData()).get('nombre')?.toString();
		if (!nombre) return { success: false, error: 'Se debe indicar qué juzgado unificar.' };

		try {
			const { absorbidos, filasDescartadas } = await fusionarJuzgado(nombre);
			return {
				success: true,
				message:
					`${nombre}: se unificaron ${absorbidos} registro(s) en uno solo` +
					(filasDescartadas ? `, descartando ${filasDescartadas} filas repetidas.` : '.') +
					' Las calificaciones de ese juzgado hay que volver a generarlas.',
			};
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : 'No se pudo unificar el juzgado.' };
		}
	},
};
