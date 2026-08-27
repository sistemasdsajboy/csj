import { db } from '$lib/server/db-client';
import { lucia } from '$lib/server/auth';
import { sendEmail } from '$lib/server/email.js';
import { hash, verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import { randomInt } from 'node:crypto';

// recommended minimum parameters
const passwordHashOptions = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1,
};

export const actions = {
	login: async ({ request }) => {
		const formData = await request.formData();
		const username = formData.get('username');

		if (typeof username !== 'string' || username.length < 3 || username.length > 31 || !/^[a-z0-9]+$/.test(username)) {
			return fail(400, { message: 'Nombre de usuario no válido' });
		}

		// El código es la credencial de acceso. `Math.random()` no sirve para esto:
		// su generador es reconstruible observando suficientes salidas, y quien lo
		// logre puede predecir el código que se le envía a otra persona.
		const password = randomInt(100000, 1000000).toString();
		const passwordHash = await hash(password, passwordHashOptions);

		const to = `${username}@cendoj.ramajudicial.gov.co`;
		const html = `
<h1>Inicio de sesión</h1>
<p>Aplicación de calificaciones</p>
<p>Consejo Seccional de la Judicatura - Boyacá y Casanare</p>
<hr/>
<p>Usuario: ${username}@cendoj.ramajudicial.gov.co</p>
<p>Código: ${password}</p>`;
		const sentEmailId = await sendEmail({ subject: 'Inicio de sesión', to, html });
		if (!sentEmailId) return fail(500, { message: 'Error al enviar correo electrónico con el código de acceso.' });

		let user = await db.user.findFirst({ where: { username } });
		const passwordExpiresAt = dayjs().add(10, 'minutes').toDate();
		if (!user) {
			await db.user.create({
				data: { username, password: passwordHash, passwordExpiresAt },
			});
		} else {
			await db.user.update({
				where: { id: user.id },
				data: { password: passwordHash, passwordExpiresAt },
			});
		}

		return { success: true, username };
	},
	loginCode: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const code = formData.get('code');

		// Los fallos devuelven también el usuario. Sin él la página no sabe que
		// ya se pidió el código y se devuelve a la pantalla inicial: la persona
		// escribe un código, se le borra todo y nadie le dice que se equivocó.
		const usuario = username?.toString() ?? '';
		const codigoIncorrecto = { message: 'Código de verificación incorrecto.', username: usuario };

		if (!code || !username) return fail(400, codigoIncorrecto);

		let user = await db.user.findFirst({ where: { username: usuario } });
		if (!user) return fail(400, codigoIncorrecto);

		if (dayjs().isAfter(user.passwordExpiresAt))
			return fail(400, { message: 'El código venció. Solicite uno nuevo.', username: usuario, vencido: true });

		const isValidPassword = await verify(user.password, code.toString(), passwordHashOptions);
		if (!isValidPassword) return fail(400, codigoIncorrecto);

		const session = await lucia.createSession(user.id, { username: user.username }, { sessionId: new ObjectId().toString() });
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes,
		});

		redirect(302, '/');
	},
};
