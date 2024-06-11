import { db } from '$lib/db/client';
import type { UserRoles } from '@prisma/client';
import { fail } from '@sveltejs/kit';
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
			despachoSeccionalId: true
		}
	});

	if (!user) throw fail(404, { message: 'Usuario no encontrado' });

	const updateUserForm = await superValidate(user, zod(updateUserFormSchema));

	const roles: { value: UserRoles; label: string }[] = [
		{ value: 'admin', label: 'Administrador' },
		{ value: 'editor', label: 'Edición' },
		{ value: 'reviewer', label: 'Aprobación' }
	];

	const dbDespachos = await db.despachoSeccional.findMany({
		select: { id: true, nombre: true }
	});
	const despachos = dbDespachos.map((d) => ({ value: d.id, label: d.nombre }));

	return { updateUserForm, roles, despachos };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod(updateUserFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		await db.user.update({
			where: { id: form.data.id },
			data: {
				roles: form.data.roles,
				despachoSeccionalId: form.data.despachoSeccionalId
			}
		});

		return { form };
	}
};
