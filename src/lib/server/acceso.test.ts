import { describe, expect, it } from 'vitest';
import { decidirAcceso, exigirRol } from './acceso';

const admin = { roles: ['admin', 'editor'] };
const revisor = { roles: ['reviewer'] };
const sinRoles = { roles: [] };

describe('decidirAcceso — parte privada', () => {
	it('sin sesión, una ACCIÓN privada se rechaza, no solo la página', () => {
		for (const ruta of [
			'/(loggedUser)/configuracion/tipos-despacho',
			'/(loggedUser)/despacho/[despachoId]',
			'/(loggedUser)/configuracion/usuarios/[usuarioId]',
			'/(loggedUser)/calificacion/[calificacionId]',
		])
			expect(decidirAcceso(ruta, 'POST', null)).toMatchObject({ permitir: false, estado: 401 });
	});

	it('sin sesión, una página privada redirige al login', () => {
		expect(decidirAcceso('/(loggedUser)/calificaciones', 'GET', null)).toMatchObject({ permitir: false, redirigir: '/login' });
	});

	it('con sesión pero sin roles no ve ni hace nada', () => {
		expect(decidirAcceso('/(loggedUser)/calificaciones', 'GET', sinRoles)).toMatchObject({ permitir: false, estado: 403 });
		expect(decidirAcceso('/(loggedUser)/calificacion/[calificacionId]', 'POST', sinRoles)).toMatchObject({
			permitir: false,
			estado: 403,
		});
	});

	it('el mensaje para quien no tiene roles dice qué hacer', () => {
		const d = decidirAcceso('/(loggedUser)/calificaciones', 'GET', sinRoles);
		expect(!d.permitir && d.mensaje).toMatch(/administrador/);
	});

	it('con cualquier rol entra a la parte privada', () => {
		expect(decidirAcceso('/(loggedUser)/calificaciones', 'GET', revisor)).toEqual({ permitir: true });
		expect(decidirAcceso('/(loggedUser)/configuracion/tipos-despacho', 'POST', admin)).toEqual({ permitir: true });
	});

	it('cerrar sesión funciona siempre, también sin roles', () => {
		expect(decidirAcceso('/(loggedUser)/logout', 'GET', sinRoles)).toEqual({ permitir: true });
		expect(decidirAcceso('/(loggedUser)/logout', 'GET', null)).toEqual({ permitir: true });
	});
});

describe('decidirAcceso — parte pública', () => {
	it('el login y los turnos no exigen sesión', () => {
		expect(decidirAcceso('/(public)/login', 'POST', null)).toEqual({ permitir: true });
		expect(decidirAcceso('/(public)/turnos', 'GET', null)).toEqual({ permitir: true });
	});

	it('una ruta inexistente se deja pasar para que responda 404', () => {
		expect(decidirAcceso(null, 'GET', null)).toEqual({ permitir: true });
	});

	it('no se deja engañar por una ruta que solo se parece', () => {
		expect(decidirAcceso('/(public)/(loggedUser)', 'POST', null)).toEqual({ permitir: true });
		expect(decidirAcceso('/(loggedUser)x', 'POST', null)).toMatchObject({ permitir: false });
	});
});

describe('exigirRol', () => {
	const locals = (usuario: { roles: string[] } | null) => ({ user: usuario && { id: 'u', username: 'x', ...usuario } }) as never;
	const estado = (f: () => unknown) => {
		try {
			f();
		} catch (e) {
			return (e as { status: number }).status;
		}
		return 0;
	};

	it('sin sesión responde 401', () => {
		expect(estado(() => exigirRol(locals(null), 'admin'))).toBe(401);
	});

	it('sin el rol pedido responde 403', () => {
		expect(estado(() => exigirRol(locals(revisor), 'admin'))).toBe(403);
		expect(estado(() => exigirRol(locals(sinRoles), 'admin'))).toBe(403);
	});

	it('con el rol pedido deja pasar', () => {
		expect(estado(() => exigirRol(locals(admin), 'admin'))).toBe(0);
		expect(estado(() => exigirRol(locals(revisor), 'admin', 'reviewer'))).toBe(0);
	});
});
