import { generarCalificacionFuncionario, getDiasFestivosPorTipoDespacho } from '$lib/core/calificaciones/generar-calificacion';
import { db } from '$lib/server/db-client';
import { error, redirect } from '@sveltejs/kit';
import _ from 'lodash';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

const getDataForXlsxExport = async (calificacionDespachoId: string) => {
	const calificacionDespacho = await db.calificacionDespacho.findUnique({
		where: { id: calificacionDespachoId },
		include: {
			calificacion: { select: { funcionario: { select: { nombre: true } }, periodo: true } },
			despacho: { select: { nombre: true, codigo: true } },
		},
	});
	if (!calificacionDespacho) error(400, 'Calificación no encontrada');

	const datosEstadistica = await db.registroCalificacion.findMany({
		where: {
			categoria: { not: 'Consolidado' },
			periodo: calificacionDespacho.calificacion.periodo,
			despachoId: calificacionDespacho.despachoId,
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
			restan: true,
		},
	});

	const encabezadoPagina = [
		['Despacho', `${calificacionDespacho.despacho.nombre} - ${calificacionDespacho.despacho.codigo}`],
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
			'Restan',
		],
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
			consolidado.restan,
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

export const load = (async ({ params, locals, url }) => {
	if (!locals.user) error(400, 'No autorizado');

	const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
		where: { id: params.calificacionId },
		include: {
			funcionario: true,
			observaciones: {
				select: { observaciones: true, fecha: true, autor: { select: { username: true } } },
			},
			calificaciones: { select: { despachoId: true } },
		},
	});
	if (!calificacionPeriodo) error(404, 'Calificación no encontrada');

	const despachoId = url.searchParams.get('despacho') || calificacionPeriodo.calificaciones[0].despachoId;
	const calificacion = await db.calificacionDespacho.findFirst({
		where: { calificacionId: params.calificacionId, despachoId },
		include: {
			registrosConsolidados: { include: { funcionario: { select: { id: true, nombre: true } } } },
			subfactores: true,
			despacho: { include: { tipoDespacho: true } },
			registroAudiencias: true,
			calificacion: { include: { observaciones: { include: { autor: true } } } },
		},
	});
	if (!calificacion) error(404, 'Calificación no encontrada');

	if (!calificacion.despacho.tipoDespachoId) error(404, 'El despacho de la calificación no tiene asignado un tipo de despacho.');

	const capacidadMaxima = await db.capacidadMaximaRespuesta.findFirst({
		where: {
			periodo: calificacionPeriodo.periodo,
			tipoDespachoId: calificacion.despacho.tipoDespachoId,
		},
	});

	const calificacionesAdicionales = await db.calificacionDespacho.findMany({
		where: { calificacionId: params.calificacionId, despachoId: { not: despachoId } },
		select: { id: true, despacho: { select: { id: true, nombre: true, codigo: true } } },
	});

	const novedades = await db.novedadFuncionario.findMany({
		where: {
			despachoId,
			funcionarioId: calificacionPeriodo.funcionarioId,
			AND: [{ from: { lte: new Date(calificacionPeriodo.periodo, 11, 31) } }, { to: { gte: new Date(calificacionPeriodo.periodo, 0, 1) } }],
		},
	});

	const consolidadoOrdinario = _(calificacion.registrosConsolidados)
		.filter((r) => r.clase === 'oral')
		.sortBy('desde')
		.value();
	const consolidadoTutelas = _(calificacion.registrosConsolidados)
		.filter((r) => r.clase === 'tutelas')
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

	const diasNoHabiles = getDiasFestivosPorTipoDespacho(calificacion.despacho.tipoDespacho);

	const consolidadoXlsxData = await getDataForXlsxExport(calificacion.id);

	const despachos = (await db.despachoSeccional.findMany({ orderBy: { nombre: 'asc' } })).map((d) => ({ label: d.nombre, value: d.id }));

	return {
		calificacion,
		calificacionesAdicionales,
		despacho: calificacion.despacho,
		diasNoHabiles,
		funcionario: calificacionPeriodo.funcionario,
		novedades,
		consolidadoOrdinario,
		consolidadoTutelas,
		consolidadoGarantias,
		consolidadoEscrito,
		oral,
		garantias,
		escrito,
		registroAudiencias: calificacion.registroAudiencias,
		consolidadoXlsxData,
		despachos,
		capacidadMaxima,
	};
}) satisfies PageServerLoad;

export const actions = {
	addNovedad: async ({ request, params, locals }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
			include: { calificaciones: { select: { despachoId: true } } },
		});
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada.' };

		const data = Object.fromEntries(await request.formData());
		const despachoId = data.despachoId.toString();
		if (!despachoId)
			return {
				success: false,
				error: 'Se debe especificar el despacho al cual corresponde la novedad.',
			};

		const calificacion = await db.calificacionDespacho.findFirst({
			where: { calificacionId: params.calificacionId, despachoId },
		});
		if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };

		if (calificacionPeriodo.estado === 'aprobada')
			return {
				success: false,
				error: 'No es posible agregar una novedad a una calificación que ya ha sido aprobada.',
			};

		// TODO: Validar que la novedad está totalmente dentro de los rangos de tiempo
		// en los que el funcionario trabajó en el despacho de la calificación.
		// Si una novedad abarca más de un periodo laborado, se debe dividir y registrar con la calificación correspondiente.

		const nuevaNovedadSchema = z.object({
			funcionarioId: z.string(),
			despachoId: z.string(),
			type: z
				.string()
				.min(1)
				// TODO: Validación requerida porque con select de shadui-svelte, si no se selecciona un valor, formData.get('type') devuelve un string 'undefined'.
				.refine((v) => v !== 'undefined'),
			from: z.date(),
			to: z.date(),
			days: z.coerce.number(),
			diasDescontables: z.coerce.number(),
			notes: z.string(),
		});

		const despacho = await db.despacho.findFirst({ where: { id: calificacion.despachoId } });
		if (!despacho) return { success: false, error: 'Despacho no encontrado.' };

		const { success, data: newNovedad } = nuevaNovedadSchema.safeParse({
			funcionarioId: calificacionPeriodo.funcionarioId,
			despachoId: calificacion.despachoId,
			type: data.type,
			from: new Date(data.from.toString()),
			to: new Date(data.to.toString()),
			days: data.dias.toString(),
			diasDescontables: data.diasDescontables.toString(),
			notes: data.notes.toString(),
		});

		if (!success) return { success: false, error: 'Datos incompletos o no válidos.' };

		// TODO: Calcular el número de días descontables de la novedad en lugar de solicitar el dato al usuario.

		await db.novedadFuncionario.create({ data: newNovedad });

		try {
			await generarCalificacionFuncionario(calificacionPeriodo.funcionarioId, calificacionPeriodo.periodo);
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return {
				success: false,
				error: 'Se agregó la novedad, pero no se pudo generar la calificación. Es necesario recalcular la calificación.',
			};
		}

		redirect(302, `/calificacion/${params.calificacionId}?despacho=${calificacion.despachoId}`);
	},

	deleteNovedad: async ({ request, params, locals }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
			include: { calificaciones: { select: { despachoId: true } } },
		});
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada' };

		const formData = Object.fromEntries(await request.formData());
		const novedadId = formData.novedadId.toString();
		if (!formData.novedadId || typeof formData.novedadId !== 'string')
			return {
				success: false,
				error: 'Se debe especificar la novedad que desea eliminar.',
			};

		const novedad = await db.novedadFuncionario.findFirst({ where: { id: novedadId } });
		if (!novedad) return { success: false, error: 'Novedad no encontrada.' };

		if (calificacionPeriodo.estado === 'aprobada')
			return {
				success: false,
				error: 'No es posible eliminar la novedad. La calificación a la que corresponde ya ha sido aprobada.',
			};

		await db.novedadFuncionario.delete({ where: { id: novedadId } });

		try {
			await generarCalificacionFuncionario(calificacionPeriodo.funcionarioId, calificacionPeriodo.periodo);
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return {
				success: false,
				error: 'Se eliminó la novedad, pero no se pudo generar la calificación. Es necesario recalcular la calificación.',
			};
		}

		redirect(302, `/calificacion/${params.calificacionId}?despacho=${novedad.despachoId}`);
	},

	addRegistroAudiencias: async ({ request, params, locals }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
			include: { calificaciones: { select: { despachoId: true } } },
		});
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada' };

		const formData = Object.fromEntries(await request.formData());
		if (!formData.despachoId || typeof formData.despachoId !== 'string')
			return {
				success: false,
				error: 'Se debe especificar el despacho al cual corresponde la información de audiencias.',
			};

		const calificacion = await db.calificacionDespacho.findFirst({
			where: { calificacionId: params.calificacionId, despachoId: formData.despachoId },
		});

		if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };

		if (calificacionPeriodo.estado === 'aprobada')
			return {
				success: false,
				error: 'No es posible modificar la información de audiencias de una calificación que ya ha sido aprobada.',
			};

		const registroAudienciaSchema = z
			.object({
				despachoId: z.string(),
				funcionarioId: z.string(),
				periodo: z.coerce.number(),
				programadas: z.coerce.number(),
				atendidas: z.coerce.number(),
				aplazadasAjenas: z.coerce.number(),
				aplazadasJustificadas: z.coerce.number(),
				aplazadasNoJustificadas: z.coerce.number(),
			})
			.refine(
				(args) => {
					return args.programadas === args.atendidas + args.aplazadasAjenas + args.aplazadasJustificadas + args.aplazadasNoJustificadas;
				},
				{
					message: 'La suma de las audiencias atendidas y aplazadas debe ser igual al número de audiencias programadas.',
					path: ['programadas'],
				}
			);

		const { success, data } = registroAudienciaSchema.safeParse({
			despachoId: calificacion.despachoId,
			funcionarioId: calificacionPeriodo.funcionarioId,
			periodo: calificacionPeriodo.periodo,
			...formData,
		});

		if (!success) return { success: false, error: 'Datos de registro no válidos' };

		const existente = await db.registroAudiencias.findFirst({
			where: {
				despachoId: calificacion.despachoId,
				funcionarioId: calificacionPeriodo.funcionarioId,
				periodo: data.periodo,
			},
		});

		if (existente) await db.registroAudiencias.update({ where: { id: existente.id }, data });
		else await db.registroAudiencias.create({ data });

		try {
			await generarCalificacionFuncionario(calificacionPeriodo.funcionarioId, calificacionPeriodo.periodo);
		} catch (error) {
			if (error instanceof Error) return { success: false, error: error.message };
			return {
				success: false,
				error: 'Se agregó el registro de audiencias, pero no se pudo generar la calificación. Es necesario recalcular la calificación.',
			};
		}

		redirect(302, `/calificacion/${params.calificacionId}?despacho=${calificacion.despachoId}`);
	},

	solicitarAprobacion: async ({ request, params, locals, url }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) return { success: false, error: 'No autorizado' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
			include: { calificaciones: { select: { despachoId: true, diasLaborados: true, diasDescontados: true, diasHabilesDespacho: true } } },
		});
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada' };
		const despachoId = url.searchParams.get('despacho') || calificacionPeriodo.calificaciones[0].despachoId;

		const calificacion = await db.calificacionDespacho.findFirst({ where: { calificacionId: params.calificacionId, despachoId } });
		if (!calificacion) return { success: false, error: 'Calificación no encontrada.' };
		if (calificacionPeriodo.estado !== 'borrador' && calificacionPeriodo.estado !== 'devuelta')
			return {
				success: false,
				error: `El estado actual de la calificación es ${calificacionPeriodo.estado} y ya no es un borrador que deba enviarse a revisión`,
			};

		const isEditor = user.roles.includes('editor');
		if (!isEditor) return { success: false, error: 'No tiene permiso para enviar una calificación a revision.' };

		const diasLaboralesCorrectos = calificacionPeriodo.calificaciones.every(
			(calificacion) => calificacion.diasLaborados === calificacion.diasHabilesDespacho - calificacion.diasDescontados
		);

		if (!diasLaboralesCorrectos)
			return {
				success: false,
				error:
					'Los días laborados de cada uno de los despachos debe ser igual a los días hábiles del despacho menos los días descontados por las novedades.',
			};

		const formData = await request.formData();
		const observaciones = formData.get('observaciones')?.toString() || 'Enviado para revisión sin observaciones.';
		const despachoCalificadorId = formData.get('despachoId')?.toString();

		if (despachoCalificadorId?.length !== 24) return { success: false, error: 'Debe especificar el despacho calificador.' };

		const despachoCalificador = await db.despachoSeccional.findFirst({ where: { id: despachoCalificadorId } });
		if (!despachoCalificador) return { success: false, error: 'Despacho calificador no encontrado.' };

		await db.calificacionPeriodo.update({
			where: { id: params.calificacionId },
			data: {
				estado: 'revision',
				observaciones: { create: { observaciones, autorId: user.id, estado: 'revision' } },
				despachoSeccionalId: despachoCalificadorId,
			},
		});

		redirect(303, '/calificaciones');
	},

	aprobar: async ({ params, locals }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) return { success: false, error: 'No autorizado' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
			include: { calificaciones: { select: { despachoId: true } } },
		});
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada' };
		if (calificacionPeriodo.estado !== 'revision')
			return {
				success: false,
				error: `La calificación ya no se encuentra en revisión. El estado actual es ${calificacionPeriodo.estado}.`,
			};

		const isReviewer = user.roles.includes('reviewer');
		if (!isReviewer) return { success: false, error: 'No tiene permiso para aprobar una calificación.' };

		await db.calificacionPeriodo.update({
			where: { id: params.calificacionId },
			data: {
				estado: 'aprobada',
				observaciones: { create: { observaciones: 'Calificación aprobada.', autorId: user.id, estado: 'aprobada' } },
			},
		});

		redirect(303, '/calificaciones');
	},

	devolver: async ({ params, locals, request }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) return { success: false, error: 'No autorizado' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
			include: { calificaciones: { select: { despachoId: true } } },
		});
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada' };
		if (calificacionPeriodo.estado !== 'revision' && calificacionPeriodo.estado !== 'aprobada')
			return {
				success: false,
				error: `Solo se pueden devolver calificaciones en revisión o aprobadas. El estado actual es ${calificacionPeriodo.estado}.`,
			};

		const formData = await request.formData();
		const observaciones = formData.get('observaciones');

		if (!observaciones || typeof observaciones !== 'string')
			return {
				success: false,
				error: 'Debe especificar las observaciones motivo de la devolución.',
			};

		const isReviewer = user.roles.includes('reviewer');
		if (!isReviewer) return { success: false, error: 'No tiene permiso para aprobar una calificación.' };

		await db.calificacionPeriodo.update({
			where: { id: params.calificacionId },
			data: {
				estado: 'devuelta',
				observaciones: { create: { observaciones, autorId: user.id, estado: 'devuelta' } },
			},
		});

		redirect(303, '/calificaciones');
	},

	eliminarCalificacion: async ({ params, locals, request }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) return { success: false, error: 'No autorizado' };

		const isAdmin = user.roles.includes('admin');
		if (!isAdmin) return { success: false, error: 'No tiene permiso para eliminar una calificación.' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
		});
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada' };
		if (calificacionPeriodo.estado == 'revision' || calificacionPeriodo.estado == 'aprobada')
			return {
				success: false,
				error: 'No es posible eliminar una calificación que se encuentre en revisión o que ya haya sido aprobada',
			};
		if (calificacionPeriodo.estado === 'eliminada')
			return {
				success: false,
				error: 'No es posible eliminar una calificación que ya ha sido eliminada',
			};

		const formData = await request.formData();
		const observaciones = formData.get('observaciones')?.toString() || 'Calificación eliminada. Sin observaciones.';

		await db.calificacionPeriodo.update({
			where: { id: params.calificacionId },
			data: {
				estado: 'eliminada',
				observaciones: { create: { observaciones, autorId: user.id, estado: 'eliminada' } },
			},
		});

		redirect(303, '/calificaciones');
	},

	restaurarCalificacion: async ({ params, locals, request }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) return { success: false, error: 'No autorizado' };

		const isAdmin = user.roles.includes('admin');
		if (!isAdmin) return { success: false, error: 'No tiene permiso para restaurar una calificación.' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
			where: { id: params.calificacionId },
		});
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada' };

		if (calificacionPeriodo.estado !== 'eliminada')
			return {
				success: false,
				error: 'No es posible restaurar una calificación a menos que se encuentre eliminada.',
			};

		const formData = await request.formData();
		const observaciones = formData.get('observaciones')?.toString() || 'Calificación restaurada. Sin observaciones.';

		await db.calificacionPeriodo.update({
			where: { id: params.calificacionId },
			data: {
				estado: 'borrador',
				observaciones: { create: { observaciones, autorId: user.id, estado: 'borrador' } },
			},
		});
	},

	archivar: async ({ params, locals, request }) => {
		if (!locals.user) return { success: false, error: 'No autorizado' };

		const user = await db.user.findFirst({ where: { id: locals.user.id } });
		if (!user) return { success: false, error: 'No autorizado' };

		const isReviewer = user.roles.includes('reviewer');
		if (!isReviewer) return { success: false, error: 'No tiene permiso para archivar una calificación.' };

		const calificacionPeriodo = await db.calificacionPeriodo.findFirst({ where: { id: params.calificacionId } });
		if (!calificacionPeriodo) return { success: false, error: 'Calificación no encontrada' };
		if (calificacionPeriodo.estado !== 'aprobada')
			return { success: false, error: 'No es posible archivar una calificación que no haya sido aprobada.' };

		const formData = await request.formData();
		const observaciones = formData.get('observaciones')?.toString() || 'Calificación archivada. Sin observaciones.';

		await db.calificacionPeriodo.update({
			where: { id: params.calificacionId },
			data: { estado: 'archivada', observaciones: { create: { observaciones, autorId: user.id, estado: 'archivada' } } },
		});
	},
};
