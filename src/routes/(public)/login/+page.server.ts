import { db } from '$lib/server/db-client';
import { lucia } from '$lib/server/auth';
import { sendEmail } from '$lib/server/email.js';
import { hash, verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';

// recommended minimum parameters
const passwordHashOptions = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1
};

export const actions = {
	login: async ({ request }) => {
		const formData = await request.formData();
		const username = formData.get('username');

		if (
			typeof username !== 'string' ||
			username.length < 3 ||
			username.length > 31 ||
			!/^[a-z0-9]+$/.test(username)
		) {
			return fail(400, { message: 'Nombre de usuario no válido' });
		}

		const password = Math.floor(100000 + Math.random() * 900000).toString();
		const passwordHash = await hash(password, passwordHashOptions);

		const to = `${username}@cendoj.ramajudicial.gov.co`;
		const html = `
<h1>Inicio de sesión</h1>
<p>Aplicación de calificaciones</p>
<p>Consejo Seccional de la Judicatura - Boyacá y Casanare</p>
<hr/>
<p>Usuario: ${username}@cendoj.ramajudicial.gov.co</p>
<p>Código: ${password}</p>`;
		const sentEmailId = sendEmail({ subject: 'Inicio de sesión', to, html });
		if (!sentEmailId)
			return fail(500, { message: 'Error al enviar correo electrónico con el código de acceso.' });

		let user = await db.user.findFirst({ where: { username } });
		const passwordExpiresAt = dayjs().add(10, 'minutes').toDate();
		if (!user) {
			await db.user.create({
				data: { username, password: passwordHash, passwordExpiresAt }
			});
		} else {
			await db.user.update({
				where: { id: user.id },
				data: { password: passwordHash, passwordExpiresAt }
			});
		}

		return { success: true, username };
	},
	loginCode: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const code = formData.get('code');

		if (!code || !username) return fail(400, { message: 'Código de verificación incorrecto.' });

		let user = await db.user.findFirst({ where: { username: username.toString() } });
		if (!user) return fail(400, { message: 'Código de verificación incorrecto.' });

		if (dayjs().isAfter(user.passwordExpiresAt))
			return fail(400, { message: 'Código de verificación incorrecto.' });

		const isValidPassword = await verify(user.password, code.toString(), passwordHashOptions);
		if (!isValidPassword) return fail(400, { message: 'Código de verificación incorrecto.' });

		const session = await lucia.createSession(
			user.id,
			{ username: user.username },
			{ sessionId: new ObjectId().toString() }
		);
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		redirect(302, '/');
	}
};
