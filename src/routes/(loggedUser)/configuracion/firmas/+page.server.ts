import { exigirRol } from '$lib/server/acceso';
import { db } from '$lib/server/db-client';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * Quién firma los formatos de calificación integral: el consejero ponente de
 * cada despacho que califica y quien preside la sala. Cada calificación toma
 * lo configurado al guardarse y lo deja fijo cuando se aprueba.
 */

const MAXIMO = 200;

/** Lo último que se digitó a mano en una calificación, para tenerlo a la vista al configurar por primera vez. */
async function ultimosUsados() {
	const recientes = await db.calificacionPeriodo.findMany({
		where: { integral: { isSet: true } },
		select: { despachoSeccionalId: true, integral: true },
		orderBy: { id: 'desc' },
		take: 100,
	});
	const ponente = (despachoSeccionalId: string) =>
		recientes.find((c) => c.despachoSeccionalId === despachoSeccionalId && c.integral?.ponente?.trim())?.integral?.ponente?.trim() ?? null;
	const presidente = recientes.find((c) => c.integral?.presidente?.trim())?.integral?.presidente?.trim() ?? null;
	return { ponente, presidente };
}

export const load = (async ({ locals }) => {
	exigirRol(locals, 'admin');
	const [despachos, firmas, usados] = await Promise.all([
		db.despachoSeccional.findMany({ select: { id: true, nombre: true, numero: true, ponente: true }, orderBy: { numero: 'asc' } }),
		db.firmasCalificacion.findFirst({ select: { presidente: true } }),
		ultimosUsados(),
	]);
	return {
		despachos: despachos.map((d) => ({ ...d, ultimoUsado: d.ponente ? null : usados.ponente(d.id) })),
		presidente: firmas?.presidente ?? '',
		presidenteUltimoUsado: firmas?.presidente ? null : usados.presidente,
		maximo: MAXIMO,
	};
}) satisfies PageServerLoad;

const limpio = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

export const actions = {
	guardar: async ({ request, locals }) => {
		exigirRol(locals, 'admin');
		const datos = await request.formData();
		const presidente = limpio(datos.get('presidente'));
		// Los despachos salen de la base; del formulario solo se lee el campo de cada uno.
		const despachos = await db.despachoSeccional.findMany({ select: { id: true } });
		const ponentes = despachos.map((d) => ({ id: d.id, ponente: limpio(datos.get(`ponente_${d.id}`)) }));
		if (presidente.length > MAXIMO || ponentes.some((p) => p.ponente.length > MAXIMO))
			return fail(400, { error: `Cada firma admite máximo ${MAXIMO} caracteres.` });

		const actual = await db.firmasCalificacion.findFirst({ select: { id: true } });
		await db.$transaction([
			...ponentes.map((p) => db.despachoSeccional.update({ where: { id: p.id }, data: { ponente: p.ponente || null } })),
			actual
				? db.firmasCalificacion.update({ where: { id: actual.id }, data: { presidente: presidente || null } })
				: db.firmasCalificacion.create({ data: { presidente: presidente || null } }),
		]);
		return {
			success: true,
			mensaje:
				'Firmas guardadas. Las calificaciones que aún no tienen firmas las toman de inmediato; las que ya tenían, cuando se vuelvan a guardar.',
		};
	},
} satisfies Actions;
