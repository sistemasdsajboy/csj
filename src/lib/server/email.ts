import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';
import { dev } from '$app/environment';

const resend = new Resend(RESEND_API_KEY);

type SendEmailProps = {
	subject: string;
	to: string;
	html: string;
};

export async function sendEmail({ subject, to, html }: SendEmailProps) {
	// Test adress for development only
	if (dev) {
		to = 'delivered@resend.dev';
		console.log({ subject, to, html });
	}

	const from = 'Consejo Seccional de la Judicatura - Boyacá y Casanare <app@csbc.app>';
	const { data } = await resend.emails.send({ from, to: [to], subject, html });

	if (data?.id) return data.id;
	return null;
}
