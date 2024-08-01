import { createRegistrosCalificacionFromXlsx } from '$lib/core/calificaciones/carga-xlsx';
import { db } from '$lib/db/client';
import { CategoriaDespacho, EspecialidadDespacho, EstadoCalificacion } from '@prisma/client';
import { error, fail } from '@sveltejs/kit';
import _ from 'lodash';
import type { PageServerLoad } from './$types';
import { filtroCalificacionesSchema } from './validation';

const estadosVisiblesPorRol: Record<string, EstadoCalificacion[]> = {
	admin: ['borrador', 'devuelta', 'revision', 'aprobada', 'eliminada'],
	editor: ['borrador', 'devuelta', 'revision', 'aprobada'],
	reviewer: ['devuelta', 'revision', 'aprobada']
};

export const load = (async ({ locals }) => {
	if (!locals.user) error(400, 'No autorizado');
	const user = await db.user.findFirst({
		where: { id: locals.user?.id },
		include: { preferencias: true }
	});

	if (!user) error(400, 'Usuario no encontrado');
	const { roles, despachosSeccionalIds } = user;

	const estados: EstadoCalificacion[] = _.uniq(roles.flatMap((rol) => estadosVisiblesPorRol[rol]));

	const prefs = user.preferencias;

	const estado: EstadoCalificacion =
		prefs?.estado || (roles.includes('editor') ? 'borrador' : 'revision');

	const periodo = prefs?.periodo ? prefs.periodo : '';

	const calificaciones = await db.calificacionPeriodo.findMany({
		where: {
			estado,
			periodo: periodo ? parseInt(periodo) : undefined,
			despachoSeccionalId: prefs?.despachoSeccionalId || undefined,
			calificaciones: {
				some: {
					despacho: {
						tipoDespacho: {
							especialidad: prefs?.especialidad || undefined,
							categoria: prefs?.categoria || undefined
						},
						municipio: prefs?.municipio || undefined,
						distrito: prefs?.distrito || undefined
					}
				}
			}
		},
		select: {
			id: true,
			estado: true,
			funcionario: { select: { nombre: true } },
			calificaciones: { select: { despacho: { select: { nombre: true } } } },
			despachoSeccional: { select: { id: true, nombre: true } },
			observaciones: { where: { estado: 'devuelta' } }
		},
		orderBy: { funcionario: { nombre: 'asc' } }
	});

	const periodos = [
		{ label: 'Todos los periodos', value: '' },
		...(
			await db.registroCalificacion.findMany({
				select: { periodo: true },
				distinct: ['periodo']
			})
		).map((p) => ({ label: p.periodo.toString(), value: p.periodo.toString() }))
	];

	const despachosCalificadores = [
		{ label: 'Todos los despachos', value: '' },
		...(
			await db.despachoSeccional.findMany({
				where: { id: { in: despachosSeccionalIds } },
				select: { id: true, nombre: true }
			})
		).map((d) => ({ label: d.nombre, value: d.id }))
	];

	const especialidades = [
		{ label: 'Todas las especialidades', value: '' },
		...Object.values(EspecialidadDespacho).map((e) => ({
			label: e,
			value: e
		}))
	];

	const categorias = [
		{ label: 'Todas las categorías', value: '' },
		...Object.values(CategoriaDespacho).map((e) => ({ label: e, value: e }))
	];

	const distritos = [
		{ label: 'Todos los distritos', value: '' },
		...((
			await db.despacho.findMany({
				where: { distrito: { not: null } },
				distinct: ['distrito'],
				select: { distrito: true }
			})
		).map((d) => ({ label: d.distrito, value: d.distrito })) as { label: string; value: string }[])
	];

	const municipios = [
		{ label: 'Todos los municipios', value: '' },
		...((
			await db.despacho.findMany({
				where: { municipio: { not: null } },
				distinct: ['municipio'],
				select: { municipio: true }
			})
		).map((m) => ({ label: m.municipio, value: m.municipio })) as {
			label: string;
			value: string;
		}[])
	];

	const funcionarios = (
		await db.funcionario.findMany({
			orderBy: { nombre: 'asc' }
		})
	).map((f) => ({ label: f.nombre, value: f.id }));

	return {
		estado,
		periodo,
		estados,
		opcionesFiltros: {
			periodos,
			despachosCalificadores,
			especialidades,
			categorias,
			municipios,
			distritos
		},
		filtros: {
			despachoSeccionalId: prefs?.despachoSeccionalId || '',
			especialidad: prefs?.especialidad || '',
			categoria: prefs?.categoria || '',
			municipio: prefs?.municipio || '',
			distrito: prefs?.distrito || ''
		},
		calificaciones,
		funcionarios
	};
}) satisfies PageServerLoad;

export const actions = {
	actualizarFiltro: async ({ request, locals }) => {
		const data = await request.formData();
		const filter = data.get('filter') as string;
		const value = data.get('value') as string;

		if (!locals.user) return fail(401, { error: 'Usuario no autorizado' });

		const { success, data: validData } = filtroCalificacionesSchema.safeParse({
			filter,
			value: value || null
		});
		if (!success) return { success: false, error: 'Filtro no válido' };

		await db.preferencias.upsert({
			where: { userId: locals.user?.id },
			create: {
				userId: locals.user?.id,
				[validData.filter]: validData.value
			},
			update: { [validData.filter]: validData.value }
		});

		return { success: true };
	},

	loadFile: async ({ request, locals }) => {
		try {
			if (!locals.user) return fail(401, { error: 'Usuario no autorizado' });

			const data = await request.formData();
			const file = data.get('file') as File;
			if (!file.name)
				return fail(400, { error: 'Debe seleccionar un archivo de calificaciones para iniciar.' });
			if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx'))
				return fail(400, { error: 'El archivo seleccionado debe tener extensión .xls o .xlsx' });

			const registrosCargados = await createRegistrosCalificacionFromXlsx(file);
			return { success: true, message: `Archivo cargado. ${registrosCargados} registros creados.` };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : '' };
		}
	}
};
