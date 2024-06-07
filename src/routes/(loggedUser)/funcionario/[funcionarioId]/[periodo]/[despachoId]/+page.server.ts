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

export const load = (async ({ params, locals }) => {
	if (!locals.user) error(400, 'No autorizado');

	const periodo = parseInt(params.periodo);

	const calificacion = await db.calificacion.findFirst({
		where: {
			funcionarioId: params.funcionarioId,
			despachoId: params.despachoId,
			periodo
		},
		include: {
			registrosConsolidados: true,
			subfactores: true,
			despacho: true,
			funcionario: {
				include: {
					novedades: {
						where: {
							despachoId: params.despachoId,
							OR: [
								{ from: { lte: new Date(periodo, 11, 31) } },
								{ to: { gte: new Date(periodo, 0, 1) } }
							]
						}
					}
				}
			},
			registroAudiencias: true
		}
	});

	if (!calificacion) error(404, 'Calificación no encontrada');

	const funcionariosIds = _(calificacion.registrosConsolidados)
		.uniqBy('funcionarioId')
		.map((r) => r.funcionarioId)
		.value();
	const otrosFuncionarios = await db.funcionario.findMany({
		where: { id: { in: funcionariosIds } },
		select: { id: true, nombre: true }
	});

	const consolidadoOrdinario = calificacion.registrosConsolidados.filter((r) => r.clase === 'oral');
	const consolidadoTutelas = calificacion.registrosConsolidados.filter(
		(r) => r.clase === 'constitucional'
	);
	const consolidadoGarantias = calificacion.registrosConsolidados.filter(
		(r) => r.clase === 'garantias'
	);
	const consolidadoEscrito = calificacion.registrosConsolidados.filter(
		(r) => r.clase === 'escrito'
	);
	const oral = calificacion.subfactores.find((s) => s.subfactor === 'oral');
	const garantias = calificacion.subfactores.find((s) => s.subfactor === 'garantias');

	const diasNoHabiles = getDiasFestivosPorDespacho(calificacion.despacho);

	return {
		calificacion,
		despacho: calificacion.despacho,
		diasNoHabiles,
		funcionario: calificacion.funcionario,
		otrosFuncionarios,
		consolidadoOrdinario,
		consolidadoTutelas,
		consolidadoGarantias,
		consolidadoEscrito,
		oral,
		garantias,
		registroAudiencias: calificacion.registroAudiencias
	};
}) satisfies PageServerLoad;

export const actions = {
	addNovedad: async ({ request, params, locals }) => {
		try {
			if (!locals.user) error(400, 'No autorizado');

			const calificacion = await db.calificacion.findFirst({
				where: {
					funcionarioId: params.funcionarioId,
					despachoId: params.despachoId,
					periodo: parseInt(params.periodo)
				}
			});
			if (calificacion?.estado === 'aprobada')
				return {
					success: false,
					error: 'No es posible agregar una novedad a una calificación que ya ha sido aprobada.'
				};

			// TODO: Validar que la novedad está totalmente dentro de los rangos de tiempo
			// en los que el funcionario trabajó en el despacho de la calificación.
			// Si una novedad abarca más de un periodo laborado, se debe dividir y registrar con la calificación correspondiente.

			const data = await request.formData();

			const type = data.get('type') as string;
			const from = new Date(data.get('from') as string);
			const to = new Date(data.get('to') as string);
			const notes = data.get('notes') as string;

			const despacho = await db.despacho.findFirst({ where: { id: params.despachoId } });
			if (!despacho) return fail(404, { error: 'Despacho no encontrado' });

			const diasNoHabiles = getDiasFestivosPorDespacho(despacho);
			const days = countLaborDaysBetweenDates(diasNoHabiles, from, to);

			await db.novedadFuncionario.create({
				data: {
					funcionarioId: params.funcionarioId,
					despachoId: params.despachoId,
					type,
					from,
					to,
					days,
					notes
				}
			});

			await generarCalificacionFuncionario(
				params.funcionarioId,
				params.despachoId,
				parseInt(params.periodo),
				locals.user.id
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
			where: {
				funcionarioId: params.funcionarioId,
				despachoId: params.despachoId,
				periodo: parseInt(params.periodo)
			}
		});
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
			params.funcionarioId,
			params.despachoId,
			parseInt(params.periodo),
			locals.user.id
		);

		return { success: true };
	},

	addRegistroAudiencias: async ({ request, params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const calificacion = await db.calificacion.findFirst({
			where: {
				funcionarioId: params.funcionarioId,
				despachoId: params.despachoId,
				periodo: parseInt(params.periodo)
			}
		});
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
			despachoId: params.despachoId,
			funcionarioId: params.funcionarioId,
			periodo: parseInt(params.periodo),
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
				despachoId: params.despachoId,
				funcionarioId: params.funcionarioId,
				periodo: data.periodo
			}
		});

		if (existente) await db.registroAudiencias.update({ where: { id: existente.id }, data });
		else await db.registroAudiencias.create({ data });

		await generarCalificacionFuncionario(
			params.funcionarioId,
			params.despachoId,
			parseInt(params.periodo),
			locals.user.id
		);

		return { success: true };
	},

	actualizarEstado: async ({ request, params, locals }) => {
		if (!locals.user) error(400, 'No autorizado');

		const calificacion = await db.calificacion.findFirst({
			where: {
				funcionarioId: params.funcionarioId,
				despachoId: params.despachoId,
				periodo: parseInt(params.periodo)
			}
		});

		if (calificacion?.estado === 'borrador')
			await db.calificacion.update({
				where: { id: calificacion.id },
				data: { estado: 'revision' }
			});
		else if (calificacion?.estado === 'revision')
			await db.calificacion.update({
				where: { id: calificacion.id },
				data: { estado: 'aprobada' }
			});
	}
};
