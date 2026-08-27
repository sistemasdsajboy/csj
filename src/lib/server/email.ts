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
	// En desarrollo no se envía el correo: el contenido queda visible en la consola
	// y se devuelve un identificador ficticio para que el flujo continúe igual.
	if (dev) {
		console.log({ subject, to, html });
		return 'dev-correo-no-enviado';
	}

	const from = 'Consejo Seccional de la Judicatura - Boyacá y Casanare <notificacion@calificacionesboycas.com>';
	const { data } = await resend.emails.send({ from, to: [to], subject, html });

	console.log('Respuesta de resend', data);

	if (data?.id) return data.id;
	return null;
}
