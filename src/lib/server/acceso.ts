import { error } from '@sveltejs/kit';
import type { UserRoles } from '@prisma/client';

/**
 * Quién puede entrar a la parte privada de la aplicación.
 *
 * Un `+layout.server.ts` solo interviene en la CARGA de las páginas; las
 * acciones de formulario no pasan por él. Por eso la regla se aplica en
 * `hooks.server.ts`, a toda petición, y no depende de que cada acción se
 * acuerde de comprobar la sesión.
 *
 * Las cuentas se crean al pedir el código de acceso, sin roles. Hasta que un
 * administrador les asigne uno, no ven ni modifican nada.
 */

export type DecisionAcceso = { permitir: true } | { permitir: false; estado: 401 | 403; redirigir?: string; mensaje: string };

const PRIVADA = '/(loggedUser)';
// Cerrar sesión tiene que funcionar también para quien no tiene roles.
const LIBRES_EN_PRIVADA = ['/(loggedUser)/logout'];

export function decidirAcceso(rutaId: string | null, metodo: string, usuario: { roles: readonly string[] } | null): DecisionAcceso {
	if (!rutaId || !rutaId.startsWith(PRIVADA) || LIBRES_EN_PRIVADA.includes(rutaId)) return { permitir: true };

	const lectura = metodo === 'GET' || metodo === 'HEAD';

	if (!usuario)
		return lectura
			? { permitir: false, estado: 401, redirigir: '/login', mensaje: 'Debe iniciar sesión.' }
			: { permitir: false, estado: 401, mensaje: 'Debe iniciar sesión.' };

	if (!usuario.roles.length)
		return {
			permitir: false,
			estado: 403,
			mensaje: 'Su usuario no tiene permisos asignados en el sistema. Solicite a un administrador que le asigne un rol.',
		};

	return { permitir: true };
}

/**
 * Exige que la persona tenga alguno de los roles indicados. Para usar al
 * principio de cada acción que modifica algo delicado.
 */
export function exigirRol(locals: App.Locals, ...roles: UserRoles[]) {
	if (!locals.user) error(401, 'Debe iniciar sesión.');
	if (!roles.some((rol) => locals.user!.roles.includes(rol))) error(403, 'No tiene permiso para realizar esta acción.');
	return locals.user;
}
