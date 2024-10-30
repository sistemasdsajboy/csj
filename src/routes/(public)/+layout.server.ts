import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async () => {
	return { user: null };
}) satisfies LayoutServerLoad;
