import { db } from '$lib/db/client';
import {
	countLaborDaysBetweenDates,
	diaJusticia,
	festivosPorMes,
	mergeExcludedDates,
	semanaSantaCompleta,
	vacanciaJudicial
} from '$lib/utils/dates';
import type { Despacho, Funcionario, RegistroCalificacion } from '@prisma/client';
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

const getEgresoFuncionario = (data: RegistroCalificacion[], funcionarioId: string) => {
	return _.sumBy(data, (d) =>
		d.funcionarioId === funcionarioId ? d.egresoEfectivo + d.conciliaciones : 0
	);
};

const getEgresoOtrosFuncionarios = (data: RegistroCalificacion[], funcionarioId: string) => {
	return _.sumBy(data, (d) =>
		dayjs(d.desde).month() < 9 && d.funcionarioId !== funcionarioId ? d.egresoEfectivo : 0
	);
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

const generarResultadosOral = (
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
	const subfactorRespuestaEfectiva =
		(Math.min(egresoFuncionario, cargaBaseCalificacionFuncionario) / cargaProporcional) * 40;

	return {
		totalInventarioInicial,
		cargaBaseCalificacionDespacho,
		cargaBaseCalificacionFuncionario,
		egresoFuncionario,
		cargaProporcional,
		subfactorRespuestaEfectiva
	};
};

const generarResultadosGarantias = (
	funcionario: Funcionario,
	diasHabilesDespacho: number,
	diasHabilesFuncionario: number,
	data: RegistroCalificacion[]
) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const egresoFuncionario = _.sumBy(data, (d) =>
		d.funcionarioId === funcionario.id ? d.egresoEfectivo : 0
	);
	const egresoOtrosFuncionarios = _.sumBy(data, (d) =>
		dayjs(d.desde).month() < 9 && d.funcionarioId !== funcionario.id ? d.egresoEfectivo : 0
	);
	const cargaBaseCalificacionDespacho = getCargaBaseCalificacionDespacho(data);
	const cargaBaseCalificacionFuncionario = cargaBaseCalificacionDespacho - egresoOtrosFuncionarios;
	const cargaProporcional =
		(cargaBaseCalificacionDespacho * diasHabilesFuncionario) / diasHabilesDespacho;
	const subfactorGarantias = Math.min(
		(Math.min(egresoFuncionario, cargaBaseCalificacionFuncionario) / cargaProporcional) * 45,
		45
	);

	return {
		totalInventarioInicial,
		cargaBaseCalificacionDespacho,
		cargaBaseCalificacionFuncionario,
		egresoFuncionario,
		cargaProporcional,
		subfactorGarantias
	};
};

function generarConsolidado({
	diasNoHabiles,
	registros,
	categorias = [],
	incluir = true
}: {
	diasNoHabiles: Record<string, Array<number>>;
	registros: RegistroCalificacion[];
	categorias?: string[];
	incluir?: boolean;
}) {
	const agrupadoPorCategoria = _(registros)
		.filter((d) => (incluir ? categorias.includes(d.categoria) : !categorias.includes(d.categoria)))
		.groupBy('desde')
		.map((d) => ({
			periodo: d[0].periodo,
			despachoId: d[0].despachoId,
			funcionarioId: d[0].funcionarioId,
			clase: d[0].clase,
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

const PERIODO = 2023; // TODO: Modificar para permitir el registro de periodos diferentes a 2023

function getDiasFestivosPorDespacho(despacho: Despacho) {
	const { especialidad, categoria } = despacho;
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

export async function generarCalificacionFuncionario(
	registros: RegistroCalificacion[],
	funcionario: Funcionario,
	despachos: Despacho[]
) {
	const registrosOral = registros.filter((registro) => registro.clase === 'oral');
	const registrosGarantias = registros.filter((registro) => registro.clase === 'garantias');

	if (!registrosOral.length || !registrosGarantias.length)
		throw new Error('Información de "Oral" y "Garantías" incompleta.');

	if (!despachos.length) throw new Error('Despacho no especificado');

	const despacho = despachos[0]; // TODO: Gestión de múltiples despachos por funcionario
	const audiencias = await db.registroAudiencias.findFirst({
		where: { despachoId: despacho.id, periodo: PERIODO }
	});

	const diasNoHabilesDespacho = getDiasFestivosPorDespacho(despacho);
	const diasHabilesDespacho = countLaborDaysBetweenDates(
		diasNoHabilesDespacho,
		new Date(PERIODO, 0, 1),
		new Date(PERIODO, 11, 31)
	);

	const diasDescontados = funcionario.novedades
		? funcionario.novedades.reduce((dias, novedad) => {
				return dias + novedad.days;
			}, 0)
		: 0;

	const diasHabilesLaborados = diasHabilesDespacho - diasDescontados;

	const oral = generarResultadosOral(
		funcionario,
		diasHabilesDespacho,
		diasHabilesLaborados,
		registrosOral
	);

	const garantias = generarResultadosGarantias(
		funcionario,
		diasHabilesDespacho,
		diasHabilesLaborados,
		registrosGarantias
	);

	const consolidadoOrdinario = generarConsolidado({
		diasNoHabiles: diasNoHabilesDespacho,
		registros: registrosOral,
		categorias: ['Incidentes de Desacato', 'Movimiento de Tutelas'],
		incluir: false
	});

	const consolidadoTutelas = generarConsolidado({
		diasNoHabiles: diasNoHabilesDespacho,
		registros: registrosOral,
		categorias: ['Incidentes de Desacato', 'Movimiento de Tutelas']
	});

	const calificacionAudiencias = audiencias
		? ((audiencias.atendidas + audiencias.aplazadasAjenas + audiencias.aplazadasJustificadas) /
				audiencias.programadas) *
			5
		: 0;

	const factorEficienciaAudiencias = oral.subfactorRespuestaEfectiva + calificacionAudiencias;

	const calificacionTotalFactorEficiencia =
		(factorEficienciaAudiencias + garantias.subfactorGarantias) / 2;

	const funcionariosIds = _.uniqBy(registros, 'funcionarioId').map((r) => r.funcionarioId);
	const funcionarios = await db.funcionario.findMany({
		where: { id: { in: funcionariosIds } },
		select: { id: true, nombre: true }
	});

	return {
		funcionarios,
		periodo: PERIODO,
		consolidadoOrdinario,
		consolidadoTutelas,
		oral,
		garantias,
		calificacionAudiencias,
		factorEficienciaAudiencias,
		calificacionTotalFactorEficiencia,
		diasHabilesDespacho,
		diasDescontados,
		diasHabilesLaborados,
		audiencias
	};
}
