import { lucia } from '$lib/server/auth';
import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = ({ cookies }) => {
	cookies.delete(lucia.sessionCookieName, { path: '.' });

	throw redirect(302, '/login');
};
