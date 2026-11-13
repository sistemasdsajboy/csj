import { cortesDelNombre, separarEn } from '$lib/core/calificaciones/integral/datos';
import { calcularIntegral, OPCIONES_ORGANIZACION } from '$lib/core/calificaciones/integral/integral';
import { factoresDe, revisarCompletitud, seccionesMotivacion } from '$lib/core/calificaciones/integral/documento';
import { comoTexto, mismoTexto, motivacionesPredeterminadas, type FactorEditable } from '$lib/core/calificaciones/integral/motivacion';
import { exigirRol } from '$lib/server/acceso';
import { db } from '$lib/server/db-client';
import { cargarEntrada } from '$lib/server/formato-integral/entrada';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

/**
 * Formato de calificación integral: lo que el sistema no calcula se digita
 * aquí mientras la calificación está en revisión. Digitan revisores y
 * administradores. El documento se descarga en revisión (borrador) y cuando
 * está aprobada.
 */

const ROLES_QUE_DIGITAN = ['reviewer', 'admin'] as const;

/** Lo último que se digitó en otra calificación del mismo despacho seccional, para no repetirlo. */
async function sugerencias(despachoSeccionalId: string | null, periodo: number, excluir: string) {
	if (!despachoSeccionalId) return {};
	const otras = await db.calificacionPeriodo.findMany({
		where: { despachoSeccionalId, id: { not: excluir }, integral: { isSet: true } },
		select: { periodo: true, integral: true },
		orderBy: { id: 'desc' },
		take: 30,
	});
	const de = <K extends 'ponente' | 'presidente' | 'iniciales' | 'oficioEscuela'>(k: K, mismoPeriodo = false) =>
		otras.find((o) => o.integral?.[k]?.trim() && (!mismoPeriodo || o.periodo === periodo))?.integral?.[k] ?? null;
	return { ponente: de('ponente'), presidente: de('presidente'), iniciales: de('iniciales'), oficioEscuela: de('oficioEscuela', true) };
}

export const load = (async ({ params, locals }) => {
	const { cp, funcionario, eficiencia, entrada } = await cargarEntrada(params.calificacionId);
	const factores = factoresDe(entrada);
	const despachosSeccionales = await db.despachoSeccional.findMany({
		select: { id: true, nombre: true, numero: true },
		orderBy: { numero: 'asc' },
	});

	return {
		calificacion: { id: cp.id, periodo: cp.periodo, estado: cp.estado, despachoSeccionalId: cp.despachoSeccionalId },
		funcionario,
		opcionesNombre: cortesDelNombre(funcionario.nombre),
		integral: cp.integral,
		textosPredeterminados: entrada.textosPredeterminados,
		despachoSeccional: cp.despachoSeccional ? { nombre: cp.despachoSeccional.nombre, numero: cp.despachoSeccional.numero } : null,
		despachosSeccionales,
		opcionesOrganizacion: Object.entries(OPCIONES_ORGANIZACION).map(([valor, o]) => ({ valor, etiqueta: o.etiqueta })),
		unSoloDespacho: eficiencia.despachos.length === 1,
		descuentos: eficiencia.despachos.length === 1 ? eficiencia.despachos[0].descuentos : null,
		sugerencias: await sugerencias(cp.despachoSeccionalId, cp.periodo, cp.id),
		factores,
		resultado: calcularIntegral(factores),
		avisos: revisarCompletitud(entrada),
		motivacion: seccionesMotivacion(entrada),
		puedeEditar: cp.estado === 'revision' && ROLES_QUE_DIGITAN.some((r) => locals.user?.roles.includes(r)),
		puedeDescargar: cp.estado === 'revision' || cp.estado === 'aprobada',
	};
}) satisfies PageServerLoad;

const texto = z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(4000).nullable());
const textoLargo = z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(30000).nullable());
// Llega solo si quien califica modificó el texto: es el predeterminado del que partió.
const base = z.string().max(30000).optional();
const numero = (min: number, max: number) =>
	z.preprocess((v) => (typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : null), z.number().min(min).max(max).nullable());
const entero = (min: number, max: number) =>
	z.preprocess((v) => (typeof v === 'string' && v.trim() ? Number(v) : null), z.number().int().min(min).max(max).nullable());
const fecha = z.preprocess(
	(v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null),
	z.date().nullable()
);

const formulario = z.object({
	// El nombre viene del sistema: solo se elige dónde se parte en nombres y apellidos.
	palabrasApellidos: entero(1, 20),
	genero: z.preprocess((v) => (v === 'femenino' || v === 'masculino' ? v : null), z.enum(['femenino', 'masculino']).nullable()),
	despachoSeccionalId: z.preprocess((v) => (typeof v === 'string' && /^[0-9a-f]{24}$/.test(v) ? v : null), z.string().nullable()),
	fechaSala: fecha,
	cargo: texto,
	municipio: texto,
	distrito: texto,
	provCargo1: texto,
	provMunicipio1: texto,
	provDistrito1: texto,
	provCargo2: texto,
	provMunicipio2: texto,
	provDistrito2: texto,
	calidadFormularios: entero(1, 1000),
	calidadSuma: numero(0, 42000),
	organizacionFechaVisita: fecha,
	organizacionOpcion: z.preprocess((v) => (typeof v === 'string' && v in OPCIONES_ORGANIZACION ? v : null), z.string().nullable()),
	organizacionPuntaje: numero(0, 12),
	oficioEscuela: texto,
	publicacionesPuntaje: z.preprocess((v) => (v === '0' ? 0 : v === '1' ? 1 : null), z.union([z.literal(0), z.literal(1)]).nullable()),
	calidadMotivacion: textoLargo,
	calidadMotivacionBase: base,
	organizacionMotivacion: textoLargo,
	organizacionMotivacionBase: base,
	publicacionesMotivacion: textoLargo,
	publicacionesMotivacionBase: base,
	motivacionLibre: textoLargo,
	ponente: texto,
	presidente: texto,
	iniciales: texto,
});

export const actions = {
	guardar: async ({ request, params, locals }) => {
		exigirRol(locals, ...ROLES_QUE_DIGITAN);
		const cp = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
			select: {
				id: true,
				estado: true,
				periodo: true,
				despachoSeccionalId: true,
				funcionario: { select: { id: true, nombre: true } },
			},
		});
		if (!cp) return fail(404, { error: 'Calificación no encontrada.' });
		if (cp.estado !== 'revision')
			return fail(400, {
				error: 'Los datos de la calificación integral solo se pueden digitar mientras la calificación está en revisión.',
			});

		const r = formulario.safeParse(Object.fromEntries(await request.formData()));
		if (!r.success) {
			const campos = r.error.issues.map((i) => i.path.join('.')).join(', ');
			return fail(400, { error: `Hay datos fuera de rango o con formato inválido: ${campos}.` });
		}
		const d = r.data;
		if (d.calidadFormularios != null && d.calidadSuma != null && d.calidadSuma / d.calidadFormularios > 42)
			return fail(400, { error: 'El factor calidad (suma / formularios) no puede pasar de 42.' });
		// El despacho que califica solo se elige aquí si la calificación no lo tiene; si ya lo tiene, se cambia desde la calificación.
		const despachoSeccionalId = cp.despachoSeccionalId ? null : d.despachoSeccionalId;
		if (despachoSeccionalId && !(await db.despachoSeccional.count({ where: { id: despachoSeccionalId } })))
			return fail(400, { error: 'El despacho que califica no existe.' });

		const partes = d.palabrasApellidos != null ? separarEn(cp.funcionario.nombre, d.palabrasApellidos) : null;
		if (d.palabrasApellidos != null && !partes)
			return fail(400, { error: 'La forma de partir el nombre no corresponde al nombre registrado.' });

		const provisionalidad = [
			{ cargo: d.provCargo1, municipio: d.provMunicipio1, distrito: d.provDistrito1 },
			{ cargo: d.provCargo2, municipio: d.provMunicipio2, distrito: d.provDistrito2 },
		].filter((c) => c.cargo);

		// Un texto se guarda como modificado solo si quien califica lo tocó y quedó distinto
		// del predeterminado con estos mismos datos; si no, sale el predeterminado.
		const pre = motivacionesPredeterminadas({ ...d, periodo: cp.periodo });
		const editada = (f: FactorEditable, texto: string | null, base: string | undefined) =>
			base === undefined || !texto || mismoTexto(texto, comoTexto(pre[f])) ? null : { texto, base };

		await db.$transaction([
			db.funcionario.update({ where: { id: cp.funcionario.id }, data: { genero: d.genero, ...(partes ?? {}) } }),
			db.calificacionPeriodo.update({
				where: { id: cp.id },
				data: {
					...(despachoSeccionalId ? { despachoSeccionalId } : {}),
					integral: {
						set: {
							fechaSala: d.fechaSala,
							cargoCarrera: { cargo: d.cargo, municipio: d.municipio, distrito: d.distrito },
							provisionalidad,
							calidadFormularios: d.calidadFormularios,
							calidadSuma: d.calidadSuma,
							organizacionFechaVisita: d.organizacionFechaVisita,
							organizacionOpcion: d.organizacionOpcion,
							organizacionPuntaje: d.organizacionOpcion === 'otro' ? d.organizacionPuntaje : null,
							oficioEscuela: d.oficioEscuela,
							publicacionesPuntaje: d.publicacionesPuntaje,
							calidadMotivacion: editada('calidad', d.calidadMotivacion, d.calidadMotivacionBase),
							organizacionMotivacion: editada('organizacion', d.organizacionMotivacion, d.organizacionMotivacionBase),
							publicacionesMotivacion: editada('publicaciones', d.publicacionesMotivacion, d.publicacionesMotivacionBase),
							motivacionLibre: d.motivacionLibre,
							ponente: d.ponente,
							presidente: d.presidente,
							iniciales: d.iniciales,
						},
					},
				},
			}),
		]);
		return { success: true, mensaje: 'Datos guardados.' };
	},
} satisfies Actions;
