import { db } from '$lib/server/db-client';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params }) => {
	const dbUsers = await db.user.findMany({ select: { id: true, username: true } });
	const users = dbUsers.map((u) => ({ ...u, isSelected: u.id === params.usuarioId }));

	return { users };
}) satisfies LayoutServerLoad;
