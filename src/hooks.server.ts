import { decidirAcceso } from '$lib/server/acceso';
import { lucia } from '$lib/server/auth';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import type { Session } from 'lucia';
import type { User } from 'lucia';

type ValidationResult = { user: User; session: Session } | { user: null; session: null };

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return proteger({ event, resolve });
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
	return proteger({ event, resolve });
};

/**
 * Aplica `decidirAcceso` a toda petición. Ver allí por qué no basta con el
 * layout: las acciones de formulario no pasan por él.
 */
const proteger: Handle = ({ event, resolve }) => {
	const decision = decidirAcceso(event.route.id, event.request.method, event.locals.user);
	if (decision.permitir) return resolve(event);

	if (decision.redirigir) redirect(303, decision.redirigir);

	if (event.request.method === 'GET' || event.request.method === 'HEAD')
		return new Response(paginaSinPermiso(decision.mensaje), {
			status: decision.estado,
			headers: { 'content-type': 'text/html; charset=utf-8' },
		});

	return new Response(decision.mensaje, { status: decision.estado, headers: { 'content-type': 'text/plain; charset=utf-8' } });
};

const paginaSinPermiso = (mensaje: string) =>
	`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
	`<title>Sin permisos</title></head><body style="font-family: system-ui, sans-serif; max-width: 36rem; margin: 4rem auto; padding: 0 1rem">` +
	`<h1 style="font-size: 1.25rem">Sin permisos</h1><p>${mensaje}</p><p><a href="/logout">Cerrar sesión</a></p></body></html>`;

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
