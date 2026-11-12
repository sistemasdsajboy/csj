import { dev } from '$app/environment';
import { db } from '$lib/server/db-client';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import type { UserRoles } from '@prisma/client';
import { Lucia } from 'lucia';

const adapter = new PrismaAdapter(db.session, db.user);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev, // set to `true` when using HTTPS
		},
	},
	getSessionAttributes: (databaseSessionAttributes) => {
		return {
			username: databaseSessionAttributes.username,
		};
	},
	// Los roles viajan con la sesión para que `hooks.server.ts` decida el acceso
	// sin otra consulta. Se leen de la base en cada petición, así que quitar un
	// rol tiene efecto inmediato.
	getUserAttributes: (atributos) => {
		return {
			username: atributos.username,
			roles: atributos.roles ?? [],
		};
	},
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseSessionAttributes: DatabaseSessionAttributes;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseSessionAttributes {
	username: string;
}

interface DatabaseUserAttributes {
	username: string;
	roles: UserRoles[];
}
