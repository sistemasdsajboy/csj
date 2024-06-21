import { db } from '$lib/db/client';
import {
	countLaborDaysBetweenDates,
	diaJusticia,
	festivosPorMes,
	mergeExcludedDates,
	semanaSantaCompleta,
	vacanciaJudicial
} from '$lib/utils/dates';
import type {
	Calificacion,
	CategoriaDespacho,
	ClaseRegistroCalificacion,
	EspecialidadDespacho,
	Funcionario,
	RegistroCalificacion
} from '@prisma/client';
import { EstadoCalificacion } from '@prisma/client';
import dayjs from 'dayjs';
import _ from 'lodash';

const getInventarioInicial = (data: RegistroCalificacion[]) => {
	const minDate = _.minBy(data, 'desde')?.desde;
	return _.sumBy(data, (d) => (dayjs(d.desde).isSame(minDate) ? d.inventarioInicial : 0));
};

const getIngresoEfectivo = (data: RegistroCalificacion[]) => {
	return _.sumBy(data, (d) => d.ingresoEfectivo);
};

const getIngresoEfectivoUltimoPeriodo = (
	data: RegistroCalificacion[],
	excludedCategorias: Array<string>
) => {
	const dataProcesos = data.filter((d) => !excludedCategorias.includes(d.categoria));
	return _.sumBy(dataProcesos, (d) => (dayjs(d.desde).month() >= 9 ? d.ingresoEfectivo : 0));
};

const getInventarioFinalByCategoria = (
	data: RegistroCalificacion[],
	funcionarioId: string,
	categorias: Array<string>
) => {
	const maxDate = _.maxBy(data, 'desde')?.desde;
	return _(data)
		.filter(
			(d) =>
				d.funcionarioId === funcionarioId &&
				categorias.includes(d.categoria) &&
				dayjs(d.desde).isSame(maxDate)
		)
		.sumBy((d) => d.inventarioFinal);
};

const getEgresoTotal = (data: RegistroCalificacion[]) => _.sumBy(data, 'egresoEfectivo');

const getEgresoFuncionario = (data: RegistroCalificacion[], funcionarioId: string) => {
	return _.sumBy(data, (d) =>
		d.funcionarioId === funcionarioId ? d.egresoEfectivo + d.conciliaciones : 0
	);
};

const getEgresoOtrosFuncionarios = (data: RegistroCalificacion[], funcionarioId: string) => {
	return _.sumBy(data, (d) => (d.funcionarioId !== funcionarioId ? d.egresoEfectivo : 0));
};

const getCargaBaseCalificacionDespacho = (data: RegistroCalificacion[]) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const ingresoEfectivo = getIngresoEfectivo(data);
	return totalInventarioInicial + ingresoEfectivo;
};

const getCargaBaseCalificacionDespachoOral = (
	data: RegistroCalificacion[],
	funcionario: string
) => {
	const cargaBaseDespacho = getCargaBaseCalificacionDespacho(data);
	const ingresoEfectivoProcesosUltimoPeriodo = getIngresoEfectivoUltimoPeriodo(data, [
		'Incidentes de Desacato',
		'Movimiento de Tutelas'
	]);
	const inventarioFinalTutelas = getInventarioFinalByCategoria(data, funcionario, [
		'Incidentes de Desacato',
		'Movimiento de Tutelas'
	]);
	return cargaBaseDespacho - ingresoEfectivoProcesosUltimoPeriodo - inventarioFinalTutelas;
};

const generarResultadosSubfactorOral = (
	funcionario: Funcionario,
	diasHabilesDespacho: number,
	diasHabilesFuncionario: number,
	data: RegistroCalificacion[]
) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const egresoFuncionario = getEgresoFuncionario(data, funcionario.id);
	const egresoOtrosFuncionarios = getEgresoOtrosFuncionarios(data, funcionario.id);
	const cargaBaseCalificacionDespacho = getCargaBaseCalificacionDespachoOral(data, funcionario.id);
	const cargaBaseCalificacionFuncionario = cargaBaseCalificacionDespacho - egresoOtrosFuncionarios;
	const cargaProporcional =
		(cargaBaseCalificacionDespacho * diasHabilesFuncionario) / diasHabilesDespacho;
	const totalSubfactor = cargaProporcional
		? (Math.min(egresoFuncionario, cargaBaseCalificacionFuncionario) / cargaProporcional) * 40
		: 0;

	return {
		subfactor: 'oral' as ClaseRegistroCalificacion,
		totalInventarioInicial,
		cargaBaseCalificacionDespacho,
		cargaBaseCalificacionFuncionario,
		egresoFuncionario,
		cargaProporcional,
		totalSubfactor
	};
};

const generarResultadosSubfactor = (
	funcionario: Funcionario,
	diasHabilesDespacho: number,
	diasHabilesFuncionario: number,
	data: RegistroCalificacion[],
	clase: ClaseRegistroCalificacion
) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const egresoFuncionario = getEgresoFuncionario(data, funcionario.id);
	const egresoOtrosFuncionarios = getEgresoOtrosFuncionarios(data, funcionario.id);
	const cargaBaseCalificacionDespacho = getCargaBaseCalificacionDespacho(data);
	const cargaBaseCalificacionFuncionario = cargaBaseCalificacionDespacho - egresoOtrosFuncionarios;
	const cargaProporcional =
		(cargaBaseCalificacionDespacho * diasHabilesFuncionario) / diasHabilesDespacho;
	const totalSubfactor = cargaProporcional
		? Math.min(
				(Math.min(egresoFuncionario, cargaBaseCalificacionFuncionario) / cargaProporcional) * 45,
				45
			)
		: 0;

	return {
		subfactor: clase,
		totalInventarioInicial,
		cargaBaseCalificacionDespacho,
		cargaBaseCalificacionFuncionario,
		egresoFuncionario,
		cargaProporcional,
		totalSubfactor
	};
};

function generarConsolidado({
	diasNoHabiles,
	registros,
	categorias = [],
	excluirCategorias = false,
	clase
}: {
	diasNoHabiles: Record<string, Array<number>>;
	registros: RegistroCalificacion[];
	categorias?: string[];
	excluirCategorias?: boolean;
	clase?: ClaseRegistroCalificacion;
}) {
	const agrupadoPorCategoria = _(registros)
		.filter((d) => {
			if (categorias.length === 0) return true;
			return excluirCategorias
				? !categorias.includes(d.categoria)
				: categorias.includes(d.categoria);
		})
		.groupBy('desde')
		.map((d) => ({
			periodo: d[0].periodo,
			despachoId: d[0].despachoId,
			funcionarioId: d[0].funcionarioId,
			clase: clase || d[0].clase,
			categoria: 'Consolidado',
			desde: d[0].desde,
			hasta: d[0].hasta,
			dias: countLaborDaysBetweenDates(diasNoHabiles, d[0].desde, d[0].hasta),
			inventarioInicial: _.sumBy(d, 'inventarioInicial'),
			ingresoEfectivo: _.sumBy(d, 'ingresoEfectivo'),
			cargaEfectiva: _.sumBy(d, 'cargaEfectiva'),
			egresoEfectivo: _.sumBy(d, 'egresoEfectivo'),
			conciliaciones: _.sumBy(d, 'conciliaciones'),
			inventarioFinal: _.sumBy(d, 'inventarioFinal'),
			restan: _.sumBy(d, 'restan')
		}))
		.sortBy('desde')
		.value();

	return agrupadoPorCategoria;
}

export function getDiasFestivosPorDespacho({
	especialidad,
	categoria
}: {
	especialidad: EspecialidadDespacho | null;
	categoria: CategoriaDespacho | null;
}) {
	if (!especialidad || !categoria) throw new Error('Información del despacho no válida');

	if (especialidad === null || categoria === null) festivosPorMes;

	if (especialidad === 'EjecucionPenas' || especialidad === 'FamiliaPromiscuo')
		return mergeExcludedDates(festivosPorMes, diaJusticia);

	if (
		categoria === 'Municipal' &&
		(especialidad === 'PenalAdolescentes' ||
			especialidad === 'PenalGarantias' ||
			especialidad === 'PenalConocimiento' ||
			especialidad === 'PenalMixto')
	)
		return mergeExcludedDates(festivosPorMes, diaJusticia, semanaSantaCompleta);

	return mergeExcludedDates(festivosPorMes, diaJusticia, semanaSantaCompleta, vacanciaJudicial);
}

async function calcularPonderada(
	calificaciones: { diasLaborados: number; calificacionTotalFactorEficiencia: number }[]
) {
	if (calificaciones.length === 0) return 0;
	if (calificaciones.length === 1) return calificaciones[0].calificacionTotalFactorEficiencia;

	const totalDiasLaborados = _.sumBy(calificaciones, 'diasLaborados');
	return _(calificaciones)
		.map(
			({ diasLaborados, calificacionTotalFactorEficiencia }) =>
				(calificacionTotalFactorEficiencia / totalDiasLaborados) * diasLaborados
		)
		.sum();
}

export async function generarCalificacionFuncionario(
	funcionarioId: string,
	despachoId: string,
	periodo: number
): Promise<Calificacion> {
	const calificacion = await db.calificacion.findFirst({
		where: { funcionarioId, despachoId, periodo: periodo }
	});

	if (calificacion?.estado === 'aprobada') return calificacion;

	const registros = await db.registroCalificacion.findMany({
		where: { despachoId, periodo, categoria: { not: 'Consolidado' } }
	});

	const funcionario = await db.funcionario.findFirst({
		where: { id: funcionarioId },
		include: {
			// Consultar solo las novedades para el despacho y periodo para el que se genera la calificación
			novedades: {
				where: {
					despachoId,
					OR: [
						{ from: { lte: new Date(periodo, 11, 31) } },
						{ to: { gte: new Date(periodo, 0, 1) } }
					]
				}
			}
		}
	});

	if (!funcionario) throw new Error('Funcionario no encontrado');

	const despacho = await db.despacho.findFirst({ where: { id: despachoId } });
	if (!despacho) throw new Error('Despacho no encontrado');

	const registrosOral = registros.filter((registro) => registro.clase === 'oral');
	const registrosGarantias = registros.filter((registro) => registro.clase === 'garantias');
	const registrosEscrito = registros.filter((registro) => registro.clase === 'escrito');

	let audiencias = await db.registroAudiencias.findFirst({
		where: { periodo, funcionarioId, despachoId }
	});
	if (!audiencias)
		audiencias = await db.registroAudiencias.create({
			data: {
				periodo,
				funcionarioId: funcionario.id,
				despachoId: despacho.id,
				programadas: 0,
				atendidas: 0,
				aplazadasAjenas: 0,
				aplazadasJustificadas: 0,
				aplazadasNoJustificadas: 0
			}
		});

	const diasNoHabiles = getDiasFestivosPorDespacho(despacho);
	const diasHabilesDespacho = countLaborDaysBetweenDates(
		diasNoHabiles,
		new Date(periodo, 0, 1),
		new Date(periodo, 11, 31)
	);

	const consolidadoOrdinario = generarConsolidado({
		diasNoHabiles,
		registros: registrosOral,
		categorias: ['Incidentes de Desacato', 'Movimiento de Tutelas'],
		excluirCategorias: true
	});

	const consolidadoTutelas = generarConsolidado({
		diasNoHabiles,
		registros: registrosOral,
		categorias: ['Incidentes de Desacato', 'Movimiento de Tutelas'],
		clase: 'constitucional'
	});
	const consolidadoGarantias = generarConsolidado({ diasNoHabiles, registros: registrosGarantias });
	const consolidadoEscrito = generarConsolidado({ diasNoHabiles, registros: registrosEscrito });

	const diasHabilesVinculacion = consolidadoOrdinario
		.filter((registro) => registro.funcionarioId === funcionario.id)
		.map((registro) => registro.dias)
		.reduce((a, b) => a + b, 0);

	const diasDescontados = funcionario.novedades
		? funcionario.novedades.reduce((dias, novedad) => {
				return dias + novedad.days;
			}, 0)
		: 0;

	// Dias de las novedades que se encuentran dentro de los rangos de tiempo efectivamente laborado.
	const diasDescontables = funcionario.novedades
		? funcionario.novedades.reduce((dias, novedad) => {
				return dias + novedad.diasDescontables;
			}, 0)
		: 0;

	const diasHabilesLaborados = diasHabilesVinculacion - diasDescontables;

	const oral = generarResultadosSubfactorOral(
		funcionario,
		diasHabilesDespacho,
		diasHabilesLaborados,
		registrosOral
	);

	const garantias = generarResultadosSubfactor(
		funcionario,
		diasHabilesDespacho,
		diasHabilesLaborados,
		registrosGarantias,
		'garantias'
	);

	const baseOral = getCargaBaseCalificacionDespacho(registrosOral);
	const baseGarantias = getCargaBaseCalificacionDespacho(registrosGarantias);
	const egresoOral = getEgresoTotal(registrosOral);
	const egresoGarantias = getEgresoTotal(registrosGarantias);

	const escrito = generarResultadosSubfactor(
		funcionario,
		diasHabilesDespacho,
		diasHabilesLaborados,
		registrosEscrito,
		'escrito'
	);

	const calificacionAudiencias =
		audiencias.programadas === 0
			? 0
			: ((audiencias.atendidas + audiencias.aplazadasAjenas + audiencias.aplazadasJustificadas) /
					audiencias.programadas) *
				5;

	const factorOralMasAudiencias = oral.totalSubfactor + calificacionAudiencias;

	const calificacionTotalFactorEficiencia =
		(factorOralMasAudiencias + garantias.totalSubfactor) / 2;

	const consolidados = [
		...consolidadoOrdinario,
		...consolidadoTutelas,
		...consolidadoGarantias,
		...consolidadoEscrito
	];

	const calificaciones = await db.calificacion.findMany({
		where: { funcionarioId, periodo, id: { not: calificacion?.id } }
	});
	const calificacionPonderada = await calcularPonderada([
		...calificaciones,
		{ diasLaborados: diasHabilesLaborados, calificacionTotalFactorEficiencia }
	]);
	await db.calificacion.updateMany({
		where: { funcionarioId, periodo, id: { not: calificacion?.id } },
		data: { calificacionPonderada }
	});

	const data = {
		estado: EstadoCalificacion.borrador,
		periodo,
		funcionarioId: funcionario.id,
		despachoId: despacho.id,
		cargaEfectivaTotal: baseOral + baseGarantias,
		egresoEfectivoTotal: egresoOral + egresoGarantias,
		diasHabilesDespacho,
		diasDescontados,
		diasLaborados: diasHabilesLaborados,
		registrosConsolidados: { createMany: { data: consolidados } },
		subfactores: { createMany: { data: [oral, garantias, escrito] } },
		registroAudienciasId: audiencias.id,
		calificacionAudiencias,
		factorOralMasAudiencias,
		calificacionTotalFactorEficiencia,
		calificacionPonderada
	};

	if (calificacion) {
		await db.registroCalificacion.deleteMany({
			where: { calificacionId: calificacion.id, categoria: 'Consolidado' }
		});
		await db.calificacionSubfactor.deleteMany({
			where: { calificacionId: calificacion.id }
		});

		return db.calificacion.update({
			where: { id: calificacion.id },
			// Al regenerar la calificación, preservar el estado actual.
			data: { ...data, estado: calificacion.estado }
		});
	} else {
		return db.calificacion.create({ data });
	}
}
