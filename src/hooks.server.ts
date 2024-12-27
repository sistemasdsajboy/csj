import { lucia } from '$lib/server/auth';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import type { Session } from 'lucia';
import type { User } from 'lucia';

type ValidationResult = { user: User; session: Session } | { user: null; session: null };

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	let validationResult: ValidationResult = { user: null, session: null };
	try {
		// Handle case where an invalid session info exists. In that case the validation throws an error
		validationResult = await lucia.validateSession(sessionId);
	} catch (error) {}

	const { session, user } = validationResult;

	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes,
		});
	}

	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes,
		});
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

export const handleError: HandleServerError = ({ event, error }) => {
	console.error(
		{
			clientAddress: event.getClientAddress(),
			locals: event.locals,
			params: event.params,
			platform: event.platform,
			request: event.request,
			url: event.url,
		},
		error
	);

	return { message: 'Error al cargar la página solicitada.' };
};
