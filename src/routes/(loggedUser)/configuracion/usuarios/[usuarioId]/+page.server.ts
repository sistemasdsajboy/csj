import { db } from '$lib/server/db-client';
import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import { updateUserFormSchema } from './validation';

export const load = (async ({ params }) => {
	const user = await db.user.findFirst({
		where: { id: params.usuarioId },
		select: {
			id: true,
			username: true,
			roles: true,
			despachosSeccionalIds: true,
		},
	});

	if (!user) throw fail(404, { message: 'Usuario no encontrado' });

	const updateUserForm = await superValidate(user, zod(updateUserFormSchema));

	const roles: { value: 'admin' | 'editor' | 'reviewer'; label: string }[] = [
		{ value: 'admin', label: 'Administrador' },
		{ value: 'editor', label: 'Edición' },
		{ value: 'reviewer', label: 'Aprobación' },
	];

	const dbDespachos = await db.despachoSeccional.findMany({
		select: { id: true, nombre: true },
	});
	const despachos = dbDespachos.map((d) => ({ value: d.id, label: d.nombre }));

	return { updateUserForm, roles, despachos };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const user = await db.user.findFirst({ where: { id: locals.user?.id } });
		if (!user) throw fail(404, { message: 'Usuario no encontrado' });
		const adminsCount = await db.user.count({ where: { roles: { has: 'admin' } } });
		if (!user.roles.includes('admin') && adminsCount > 1) error(403, 'No autorizado');

		// TODO: Crear página de gestión de despachos en /configuracion y eliminar esta creación
		const despachosSeccional = await db.despachoSeccional.findMany({});
		if (!despachosSeccional.length) {
			await db.despachoSeccional.createMany({
				data: [
					{
						seccional: 'Tunja',
						nombre: 'Despacho 1 - Consejo Seccional de la Judicatura - Tunja',
						numero: 1,
					},
					{
						seccional: 'Tunja',
						nombre: 'Despacho 2 - Consejo Seccional de la Judicatura - Tunja',
						numero: 2,
					},
				],
			});
		}
		// END TODO

		const formData = await request.formData();
		const form = await superValidate(formData, zod(updateUserFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const adminsLeft = await db.user.count({ where: { roles: { has: 'admin' } } });
		if (adminsLeft === 1 && !form.data.roles.includes('admin'))
			error(400, 'No se puede quitar el rol de administrador al último usuario con este rol.');

		await db.user.update({
			where: { id: form.data.id },
			data: {
				roles: form.data.roles,
				despachosSeccionalIds: form.data.despachosSeccionalIds,
			},
		});

		return { form };
	},
};
