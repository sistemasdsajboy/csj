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

const aggregatePageDataOral = (
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

const aggregatePageDataGarantias = (
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

export async function generarCalificacionFuncionario(
	registros: RegistroCalificacion[],
	funcionario: Funcionario,
	despachos: Despacho[]
) {
	const registrosOral = registros.filter((registro) => registro.clase === 'oral');
	const registrosGarantias = registros.filter((registro) => registro.clase === 'garantias');

	if (!registrosOral.length || !registrosGarantias.length)
		throw new Error('Información de "Oral" y "Garantías" incompleta.');

	if (!despachos) throw new Error('Despacho no especificado');

	// TODO: CALCULAR/SOLICITAR VALORES DE ESTAS CONSTANTES
	const TIPO_DESPACHO = 'Promiscuo Municipal';
	const DIAS_HABILES_DESPACHO = 227; // DEPENDE DEL TIPO DE DESPACHO

	const AUDIENCIAS_PROGRAMADAS = 10 + 18 + 18; //60;
	const AUDIENCIAS_ATENDIDAS = 8 + 14 + 12; // 60;
	const AUDIENCIAS_APLAZADAS_CAUSAS_AJENAS = 2 + 4 + 6; //0;
	const AUDIENCIAS_APLAZADAS_JUSTIFICADAS = 0;
	const AUDIENCIAS_APLAZADAS_NO_JUSTIFICADAS = 0;

	const diasDescontados = funcionario.novedades
		? funcionario.novedades.reduce((dias, novedad) => {
				return dias + novedad.days;
			}, 0)
		: 0;

	const diasHabilesLaborados = DIAS_HABILES_DESPACHO - diasDescontados;

	const oral = aggregatePageDataOral(
		funcionario,
		DIAS_HABILES_DESPACHO,
		diasHabilesLaborados,
		registrosOral
	);

	const garantias = aggregatePageDataGarantias(
		funcionario,
		DIAS_HABILES_DESPACHO,
		diasHabilesLaborados,
		registrosGarantias
	);

	const calificacionAudiencias =
		((AUDIENCIAS_ATENDIDAS +
			AUDIENCIAS_APLAZADAS_CAUSAS_AJENAS +
			AUDIENCIAS_APLAZADAS_JUSTIFICADAS) /
			AUDIENCIAS_PROGRAMADAS) *
		5;

	const factorEficienciaAudiencias = oral.subfactorRespuestaEfectiva + calificacionAudiencias;

	const calificacionTotalFactorEficiencia =
		(factorEficienciaAudiencias + garantias.subfactorGarantias) / 2;

	return {
		oral,
		garantias,
		calificacionAudiencias,
		factorEficienciaAudiencias,
		calificacionTotalFactorEficiencia,
		diasHabilesDespacho: DIAS_HABILES_DESPACHO,
		diasDescontados,
		diasHabilesLaborados
	};
}
