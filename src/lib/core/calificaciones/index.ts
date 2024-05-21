import {
	registroCalificacionDataSchema,
	registroCalificacionDataSchemaColumns,
	type RegistroCalificacion,
	type RegistroCalificacionPage
} from '$lib/db/schema';
import dayjs from 'dayjs';
import _ from 'lodash';
import xlsx from 'node-xlsx';
import z from 'zod';

type WorkbookPage = { name: string; data: unknown[][] };

type Workbook = Array<WorkbookPage>;

export const getDespachoFromFileData = async (file: File): Promise<string> => {
	const woorkbook: Workbook = xlsx.parse(await file.arrayBuffer());
	return woorkbook[0].data[0][0] as string;
};

export const getFileRawGradeData = async (file: File): Promise<Array<RegistroCalificacionPage>> => {
	const woorkbook: Workbook = xlsx.parse(await file.arrayBuffer());
	return woorkbook.map(extractWorkbookPageData);
};

const consolidadoRowSchema = z.tuple([
	z.string(),
	z.string(),
	z.coerce.date(),
	z.coerce.date(),
	z.number(),
	z.number(),
	z.number(),
	z.number(),
	z.number(),
	z.number(),
	z.undefined(),
	z.undefined(),
	z.number()
]);

const extractWorkbookPageData = (page: WorkbookPage) => {
	const pageData = page.data
		.map((data) => consolidadoRowSchema.safeParse(data))
		.filter((parsed) => parsed.success)
		.map((parsed) => parsed.data!.filter((value) => value !== undefined))
		.map((data) =>
			registroCalificacionDataSchema.parse(_.zipObject(registroCalificacionDataSchemaColumns, data))
		);
	return { name: page.name, data: pageData };
};

const getInventarioInicial = (data: Array<z.infer<typeof registroCalificacionDataSchema>>) => {
	const minDate = _.minBy(data, 'desde')?.desde;
	return _.sumBy(data, (d) => (dayjs(d.desde).isSame(minDate) ? d.inventarioInicial : 0));
};

const getIngresoEfectivo = (data: Array<z.infer<typeof registroCalificacionDataSchema>>) => {
	return _.sumBy(data, (d) => d.ingresoEfectivo);
};

const getIngresoEfectivoUltimoPeriodo = (
	data: Array<z.infer<typeof registroCalificacionDataSchema>>,
	excludedCategorias: Array<string>
) => {
	const dataProcesos = data.filter((d) => !excludedCategorias.includes(d.categoria));
	return _.sumBy(dataProcesos, (d) => (dayjs(d.desde).month() >= 9 ? d.ingresoEfectivo : 0));
};

const getInventarioFinalByCategoria = (
	data: Array<z.infer<typeof registroCalificacionDataSchema>>,
	funcionario: string,
	categorias: Array<string>
) => {
	const maxDate = _.maxBy(data, 'desde')?.desde;
	return _(data)
		.filter(
			(d) =>
				d.funcionario === funcionario &&
				categorias.includes(d.categoria) &&
				dayjs(d.desde).isSame(maxDate)
		)
		.sumBy((d) => d.inventarioFinal);
};

const getEgresoFuncionario = (
	data: Array<z.infer<typeof registroCalificacionDataSchema>>,
	funcionario: string
) => {
	return _.sumBy(data, (d) =>
		d.funcionario === funcionario ? d.egresoEfectivo + d.conciliaciones : 0
	);
};

const getEgresoOtrosFuncionarios = (
	data: Array<z.infer<typeof registroCalificacionDataSchema>>,
	funcionario: string
) => {
	return _.sumBy(data, (d) =>
		dayjs(d.desde).month() < 9 && d.funcionario !== funcionario ? d.egresoEfectivo : 0
	);
};

const getCargaBaseCalificacionDespacho = (
	data: Array<z.infer<typeof registroCalificacionDataSchema>>,
	funcionario: string
) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const ingresoEfectivo = getIngresoEfectivo(data);
	return totalInventarioInicial + ingresoEfectivo;
};

const getCargaBaseCalificacionDespachoOral = (
	data: Array<z.infer<typeof registroCalificacionDataSchema>>,
	funcionario: string
) => {
	const cargaBaseDespacho = getCargaBaseCalificacionDespacho(data, funcionario);
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
	funcionario: string,
	diasHabilesDespacho: number,
	diasHabilesFuncionario: number,
	data: Array<z.infer<typeof registroCalificacionDataSchema>>
) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const egresoFuncionario = getEgresoFuncionario(data, funcionario);
	const egresoOtrosFuncionarios = getEgresoOtrosFuncionarios(data, funcionario);
	const cargaBaseCalificacionDespacho = getCargaBaseCalificacionDespachoOral(data, funcionario);
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
	funcionario: string,
	diasHabilesDespacho: number,
	diasHabilesFuncionario: number,
	data: Array<z.infer<typeof registroCalificacionDataSchema>>
) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const egresoFuncionario = _.sumBy(data, (d) =>
		d.funcionario === funcionario ? d.egresoEfectivo : 0
	);
	const egresoOtrosFuncionarios = _.sumBy(data, (d) =>
		dayjs(d.desde).month() < 9 && d.funcionario !== funcionario ? d.egresoEfectivo : 0
	);
	const cargaBaseCalificacionDespacho = getCargaBaseCalificacionDespacho(data, funcionario);
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

export function getFuncionarios(accumulatedData: Array<RegistroCalificacionPage>) {
	const oralPage = accumulatedData.find((page) => page.name === 'Oral');
	if (!oralPage) throw new Error('Página de "Oral" no encontrada');
	return _.uniq(_.map(oralPage.data, 'funcionario'));
}

export function buildRendimientoGrades(registro: RegistroCalificacion, funcionario: string) {
	const oralPage = registro.data.find((page) => page.name === 'Oral');
	const garantiasPage = registro.data.find((page) => page.name === 'Garantias');
	if (!oralPage || !garantiasPage)
		throw new Error('Información de "Oral" y "Garantías" incompleta.');

	// TODO: CALCULAR/SOLICITAR VALORES DE ESTAS CONSTANTES
	const TIPO_DESPACHO = 'Promiscuo Municipal';
	const DIAS_HABILES_DESPACHO = 227; // DEPENDE DEL TIPO DE DESPACHO
	const AUDIENCIAS_PROGRAMADAS = 10 + 18 + 18; //60;
	const AUDIENCIAS_ATENDIDAS = 8 + 14 + 12; // 60;
	const AUDIENCIAS_APLAZADAS_CAUSAS_AJENAS = 2 + 4 + 6; //0;
	const AUDIENCIAS_APLAZADAS_JUSTIFICADAS = 0;
	const AUDIENCIAS_APLAZADAS_NO_JUSTIFICADAS = 0;

	const diasDescontados = registro.novedades
		? registro.novedades.reduce((dias, novedad) => {
				return dias + novedad.days;
			}, 0)
		: 0;

	const diasHabilesLaborados = DIAS_HABILES_DESPACHO - diasDescontados;

	const oral = aggregatePageDataOral(
		funcionario,
		DIAS_HABILES_DESPACHO,
		diasHabilesLaborados,
		oralPage.data
	);

	const garantias = aggregatePageDataGarantias(
		funcionario,
		DIAS_HABILES_DESPACHO,
		diasHabilesLaborados,
		garantiasPage.data
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
