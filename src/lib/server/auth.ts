import { dev } from '$app/environment';
import { db } from '$lib/server/db-client';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { Lucia } from 'lucia';

const adapter = new PrismaAdapter(db.session, db.user);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev // set to `true` when using HTTPS
		}
	},
	getSessionAttributes: (databaseSessionAttributes) => {
		return {
			username: databaseSessionAttributes.username
		};
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseSessionAttributes: DatabaseSessionAttributes;
	}
}

interface DatabaseSessionAttributes {
	username: string;
}
