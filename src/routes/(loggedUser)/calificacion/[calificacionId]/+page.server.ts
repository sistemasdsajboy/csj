import {
	generarCalificacionFuncionario,
	getDiasFestivosPorDespacho
} from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/db/client';
import { countLaborDaysBetweenDates } from '$lib/utils/dates';
import { error, fail } from '@sveltejs/kit';
import _ from 'lodash';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

const getDataForXlsxExport = async (calificacionId: string) => {
	const calificacion = await db.calificacion.findUnique({
		where: { id: calificacionId },
		include: {
			funcionario: { select: { nombre: true } },
			despacho: { select: { nombre: true, codigo: true } }
		}
	});
	if (!calificacion) error(400, 'Calificación no encontrada');

	const datosEstadistica = await db.registroCalificacion.findMany({
		where: {
			categoria: { not: 'Consolidado' },
			periodo: calificacion.periodo,
			despachoId: calificacion.despachoId
		},
		select: {
			funcionario: { select: { nombre: true, documento: true } },
			clase: true,
			categoria: true,
			desde: true,
			hasta: true,
			inventarioInicial: true,
			ingresoEfectivo: true,
			cargaEfectiva: true,
			egresoEfectivo: true,
			conciliaciones: true,
			inventarioFinal: true,
			restan: true
		}
	});

	const encabezadoPagina = [
		['Despacho', `${calificacion.despacho.nombre} - ${calificacion.despacho.codigo}`],
		[],
		[
			'Categoría',
			'Funcionario',
			'Desde',
			'Hasta',
			'Inventario inicial',
			'Ingreso efectivo',
			'Carga efectiva',
			'Egreso efectivo',
			'Conciliaciones',
			'Inventario final',
			null,
			'Restan'
		]
	];

	const crearFila = (consolidado: (typeof datosEstadistica)[number]) => {
		return [
			consolidado.categoria,
			`${consolidado.funcionario.nombre} - ${consolidado.funcionario.documento}`,
			consolidado.desde.toISOString().substring(0, 10),
			consolidado.hasta.toISOString().substring(0, 10),
			consolidado.inventarioInicial,
			consolidado.ingresoEfectivo,
			consolidado.cargaEfectiva,
			consolidado.egresoEfectivo,
			consolidado.conciliaciones,
			consolidado.inventarioFinal,
			null,
			consolidado.restan
		];
	};

	const paginas = _(datosEstadistica)
		.sortBy('desde')
		.groupBy('clase')
		.flatMap((datosPagina, clase) => {
			const data = _(datosPagina)
				.groupBy('categoria')
				.flatMap((datosCategoria) => [...datosCategoria.map(crearFila), []])
				.value();
			return [{ name: clase, data: [...encabezadoPagina, ...data], options: {} }];
		})
		.value();

	return paginas;
};

export const load = (async ({ params, locals }) => {
	if (!locals.user) error(400, 'No autorizado');

	const calificacion = await db.calificacion.findFirst({
		where: { id: params.calificacionId },
		include: {
			registrosConsolidados: true,
			subfactores: true,
			despacho: true,
			funcionario: true,
			registroAudiencias: true,
			observacionesDevolucion: {
				select: { observaciones: true, fecha: true, autor: true }
			}
		}
	});

	if (!calificacion) error(404, 'Calificación no encontrada');

	const calificacionesAdicionales = await db.calificacion.findMany({
		where: {
			id: { not: params.calificacionId },
			periodo: calificacion.periodo,
			funcionarioId: calificacion.funcionarioId
		},
		select: { id: true, despacho: { select: { nombre: true } } }
	});

	const novedades = await db.novedadFuncionario.findMany({
		where: {
			despachoId: calificacion.despachoId,
			OR: [
				{ from: { lte: new Date(calificacion.periodo, 11, 31) } },
				{ to: { gte: new Date(calificacion.periodo, 0, 1) } }
			]
		}
	});

	const funcionariosIds = _(calificacion.registrosConsolidados)
		.uniqBy('funcionarioId')
		.map((r) => r.funcionarioId)
		.value();

	const funcionariosPeriodo = await db.funcionario.findMany({
		where: { id: { in: funcionariosIds } },
		select: { id: true, nombre: true }
	});

	const consolidadoOrdinario = _(calificacion.registrosConsolidados)
		.filter((r) => r.clase === 'oral')
		.sortBy('desde')
		.value();
	const consolidadoTutelas = _(calificacion.registrosConsolidados)
		.filter((r) => r.clase === 'constitucional')
		.sortBy('desde')
		.value();
	const consolidadoGarantias = _(calificacion.registrosConsolidados)
		.filter((r) => r.clase === 'garantias')
		.sortBy('desde')
		.value();
	const consolidadoEscrito = _(calificacion.registrosConsolidados)
		.filter((r) => r.clase === 'escrito')
		.sortBy('desde')
		.value();

	const oral = calificacion.subfactores.find((s) => s.subfactor === 'oral');
	const garantias = calificacion.subfactores.find((s) => s.subfactor === 'garantias');
	const escrito = calificacion.subfactores.find((s) => s.subfactor === 'escrito');

	const diasNoHabiles = getDiasFestivosPorDespacho(calificacion.despacho);

	const consolidadoXlsxData = await getDataForXlsxExport(calificacion.id);

	return {
		calificacion,
		calificacionesAdicionales,
		despacho: calificacion.despacho,
		diasNoHabiles,
		funcionario: calificacion.funcionario,
		novedades,
		funcionariosPeriodo,
		consolidadoOrdinario,
		consolidadoTutelas,
		consolidadoGarantias,
		consolidadoEscrito,
		oral,
		garantias,
		escrito,
		registroAudiencias: calificacion.registroAudiencias,
		consolidadoXlsxData
	};
}) satisfies PageServerLoad;

export const actions = {
	addNovedad: async ({ request, params, locals }) => {
		try {
			if (!locals.user) error(400, 'No autorizado');

			const calificacion = await db.calificacion.findFirst({
				where: { id: params.calificacionId }
			});

			if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };

			if (calificacion.estado === 'aprobada')
				return {
					success: false,
					error: 'No es posible agregar una novedad a una calificación que ya ha sido aprobada.'
				};

			// TODO: Validar que la novedad está totalmente dentro de los rangos de tiempo
			// en los que el funcionario trabajó en el despacho de la calificación.
			// Si una novedad abarca más de un periodo laborado, se debe dividir y registrar con la calificación correspondiente.

			const novedadSchema = z.object({
				funcionarioId: z.string(),
				despachoId: z.string(),
				type: z
					.string()
					.min(1)
					// TODO: Validation requerida porque con select de shadui-svelte, si no se selecciona un valor, formData.get('type') returns the string'undefined'.
					.refine((v) => v !== 'undefined'),
				from: z.date(),
				to: z.date(),
				days: z.number(),
				notes: z.string()
			});

			const data = await request.formData();

			const type = data.get('type');
			const from = new Date(data.get('from') as string);
			const to = new Date(data.get('to') as string);
			const notes = data.get('notes') as string;

			const despacho = await db.despacho.findFirst({ where: { id: calificacion.despachoId } });
			if (!despacho) return fail(404, { error: 'Despacho no encontrado' });

			const diasNoHabiles = getDiasFestivosPorDespacho(despacho);
			const days = countLaborDaysBetweenDates(diasNoHabiles, from, to);

			const { success, data: newNovedad } = novedadSchema.safeParse({
				funcionarioId: calificacion.funcionarioId,
				despachoId: calificacion.despachoId,
				type,
				from,
				to,
				days,
				notes
			});

			if (!success) return { success: false, error: 'Datos incompletos o no válidos.' };

			// TODO: Calcular el número de días descontables de la novedad.

			await db.novedadFuncionario.create({ data: { ...newNovedad, diasDescontables: days } });

			await generarCalificacionFuncionario(
				calificacion.funcionarioId,
				calificacion.despachoId,
				calificacion.periodo
			);

			return { success: true };
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return { success: false, error: 'Ha ocurrido un error inesperado' };
		}
	},

	deleteNovedad: async ({ request, params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const calificacion = await db.calificacion.findFirst({
			where: { id: params.calificacionId }
		});

		if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };

		if (calificacion?.estado === 'aprobada')
			return {
				success: false,
				error:
					'No es posible eliminar la novedad. La calificación a la que corresponde ya ha sido aprobada.'
			};

		const data = await request.formData();
		const novedadId = data.get('novedadId') as string;

		await db.novedadFuncionario.delete({ where: { id: novedadId } });

		await generarCalificacionFuncionario(
			calificacion.funcionarioId,
			calificacion.despachoId,
			calificacion.periodo
		);

		return { success: true };
	},

	addRegistroAudiencias: async ({ request, params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const calificacion = await db.calificacion.findFirst({
			where: { id: params.calificacionId }
		});

		if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };

		if (calificacion?.estado === 'aprobada')
			return {
				success: false,
				error:
					'No es posible modificar la información de audiencias de una calificación que ya ha sido aprobada.'
			};

		const formData = Object.fromEntries(await request.formData());

		const registroAudienciaSchema = z.object({
			despachoId: z.string(),
			funcionarioId: z.string(),
			periodo: z.coerce.number(),
			programadas: z.coerce.number(),
			atendidas: z.coerce.number(),
			aplazadasAjenas: z.coerce.number(),
			aplazadasJustificadas: z.coerce.number(),
			aplazadasNoJustificadas: z.coerce.number()
		});

		const { success, data } = registroAudienciaSchema.safeParse({
			despachoId: calificacion.despachoId,
			funcionarioId: calificacion.funcionarioId,
			periodo: calificacion.periodo,
			...formData
		});

		if (!success) return { success: false, error: 'Datos de registro no válidos' };

		if (
			data.programadas !==
			data.atendidas +
				data.aplazadasAjenas +
				data.aplazadasJustificadas +
				data.aplazadasNoJustificadas
		)
			return {
				success: false,
				error:
					'La suma de las audiencias atendidas y aplazadas debe ser igual al número de audiencias programadas.'
			};

		const existente = await db.registroAudiencias.findFirst({
			where: {
				despachoId: calificacion.despachoId,
				funcionarioId: calificacion.funcionarioId,
				periodo: data.periodo
			}
		});

		if (existente) await db.registroAudiencias.update({ where: { id: existente.id }, data });
		else await db.registroAudiencias.create({ data });

		await generarCalificacionFuncionario(
			calificacion.funcionarioId,
			calificacion.despachoId,
			calificacion.periodo
		);

		return { success: true };
	},

	solicitarAprobacion: async ({ params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');
		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) error(400, 'No autorizado');

		const calificacion = await db.calificacion.findFirst({
			where: { id: params.calificacionId }
		});
		if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };
		if (calificacion.estado !== 'borrador' && calificacion.estado !== 'devuelta')
			return {
				success: false,
				error: `El estado actual de la calificación es ${calificacion.estado} y ya no es un borrador que deba enviarse a revisión`
			};

		const isEditor = user.roles.includes('editor');
		if (!isEditor)
			return { success: false, error: 'No tiene permiso para enviar una calificación a revision.' };

		await db.calificacion.update({ where: { id: calificacion.id }, data: { estado: 'revision' } });

		return { success: true };
	},

	aprobar: async ({ params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) error(400, 'No autorizado');

		const calificacion = await db.calificacion.findFirst({
			where: { id: params.calificacionId }
		});
		if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };
		if (calificacion.estado !== 'revision')
			return {
				success: false,
				error: `La calificación ya no se encuentra en revisión. El estado actual es ${calificacion.estado}.`
			};

		const isReviewer = user.roles.includes('reviewer');
		if (!isReviewer)
			return { success: false, error: 'No tiene permiso para aprobar una calificación.' };

		await db.calificacion.update({ where: { id: calificacion.id }, data: { estado: 'aprobada' } });

		return { success: true };
	},

	devolver: async ({ params, locals, request }) => {
		if (!locals.user) error(400, 'No autorizado');

		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) error(400, 'No autorizado');

		const calificacion = await db.calificacion.findFirst({
			where: { id: params.calificacionId }
		});
		if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };
		if (calificacion.estado !== 'revision')
			return {
				success: false,
				error: `La calificación ya no se encuentra en revisión. El estado actual es ${calificacion.estado}.`
			};

		const formData = await request.formData();
		const observaciones = formData.get('observaciones');

		if (!observaciones || typeof observaciones !== 'string')
			return {
				success: false,
				error: 'Debe especificar las observaciones motivo de la devolución.'
			};

		const isReviewer = user.roles.includes('reviewer');
		if (!isReviewer)
			return { success: false, error: 'No tiene permiso para aprobar una calificación.' };

		await db.calificacion.update({
			where: { id: calificacion.id },
			data: {
				estado: 'devuelta',
				observacionesDevolucion: { create: { observaciones, autorId: user.id } }
			}
		});

		return { success: true };
	}
};
