import dayjs from 'dayjs';
import _ from 'lodash';
import xlsx from 'node-xlsx';
import z from 'zod';

type WorkbookPage = { name: string; data: unknown[][] };

type Workbook = Array<WorkbookPage>;

export type GradeAccumulatedData = {
	name: string;
	data: Array<z.infer<typeof consolidadoExtractedDataSchema>>;
};

export const getDespachoFromFileData = async (file: File): Promise<string> => {
	const woorkbook: Workbook = xlsx.parse(await file.arrayBuffer());
	return woorkbook[0].data[0][0] as string;
};

export const getFileRawGradeData = async (file: File): Promise<Array<GradeAccumulatedData>> => {
	const woorkbook: Workbook = xlsx.parse(await file.arrayBuffer());
	return woorkbook.map(extractWorkbookPageData);
};

// ['Movimiento de Tutelas', 'Funcionario: FERNANDO IBAGUE  PINILLA Cédula: 7321266', '01/JAN/2023', '31/MAR/2023', 0, 0, 0, 0, 0, 0, undefined, undefined, 10]
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

const consolidadoExtractedDataSchemaColumns = [
	'categoria',
	'funcionario',
	'desde',
	'hasta',
	'inventarioInicial',
	'ingresoEfectivo',
	'cargaEfectiva',
	'egresoEfectivo',
	'conciliaciones',
	'inventarioFinal',
	'restan'
];

const consolidadoExtractedDataSchema = z.object({
	categoria: z.string(),
	funcionario: z.string(),
	desde: z.coerce.date(),
	hasta: z.coerce.date(),
	inventarioInicial: z.number(),
	ingresoEfectivo: z.number(),
	cargaEfectiva: z.number(),
	egresoEfectivo: z.number(),
	conciliaciones: z.number(),
	inventarioFinal: z.number(),
	restan: z.number()
});

const extractWorkbookPageData = (page: WorkbookPage) => {
	const pageData = page.data
		.map((data) => consolidadoRowSchema.safeParse(data))
		.filter((parsed) => parsed.success)
		.map((parsed) => parsed.data!.filter((value) => value !== undefined))
		.map((data) =>
			consolidadoExtractedDataSchema.parse(_.zipObject(consolidadoExtractedDataSchemaColumns, data))
		);
	return { name: page.name, data: pageData };
};

const aggregatePageDataOral = (
	funcionario: string,
	diasHabilesDespacho: number,
	diasHabilesFuncionario: number,
	data: Array<z.infer<typeof consolidadoExtractedDataSchema>>
) => {
	const firstFuncionarioRow = data.find((d) => d.funcionario === funcionario);
	const minDate = firstFuncionarioRow?.desde;
	const totalInventarioInicial = _.sumBy(data, (d) =>
		dayjs(d.desde).isSame(minDate) ? d.inventarioInicial : 0
	);
	const ingresoEfectivo = _.sumBy(data, (d) => d.ingresoEfectivo);

	const ingresoEfectivoUltimoPeriodo = _.sumBy(data, (d) =>
		dayjs(d.desde).month() >= 9 &&
		!['Incidentes de Desacato', 'Movimiento de Tutelas'].includes(d.categoria)
			? d.ingresoEfectivo
			: 0
	);

	const egresoFuncionario = _.sumBy(data, (d) =>
		d.funcionario === funcionario ? d.egresoEfectivo : 0
	);

	const egresoOtrosFuncionarios = _.sumBy(data, (d) =>
		dayjs(d.desde).month() < 9 && d.funcionario !== funcionario ? d.egresoEfectivo : 0
	);

	const cargaBaseCalificacionDespacho =
		totalInventarioInicial + ingresoEfectivo - ingresoEfectivoUltimoPeriodo;
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
	data: Array<z.infer<typeof consolidadoExtractedDataSchema>>
) => {
	const firstFuncionarioRow = data.find((d) => d.funcionario === funcionario);
	const minDate = firstFuncionarioRow?.desde;
	const totalInventarioInicial = _.sumBy(data, (d) =>
		dayjs(d.desde).isSame(minDate) ? d.inventarioInicial : 0
	);
	const ingresoEfectivo = _.sumBy(data, (d) => d.ingresoEfectivo);

	const egresoFuncionario = _.sumBy(data, (d) =>
		d.funcionario === funcionario ? d.egresoEfectivo : 0
	);

	const egresoOtrosFuncionarios = _.sumBy(data, (d) =>
		dayjs(d.desde).month() < 9 && d.funcionario !== funcionario ? d.egresoEfectivo : 0
	);

	const cargaBaseCalificacionDespacho = totalInventarioInicial + ingresoEfectivo;
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

export function getFuncionarios(accumulatedData: Array<GradeAccumulatedData>) {
	const oralPage = accumulatedData.find((page) => page.name === 'Oral');
	if (!oralPage) throw new Error('Página de "Oral" no encontrada');
	return _.uniq(_.map(oralPage.data, 'funcionario'));
}

export function buildRendimientoGrades(
	accumulatedData: Array<GradeAccumulatedData>,
	funcionario: string
) {
	const oralPage = accumulatedData.find((page) => page.name === 'Oral');
	const garantiasPage = accumulatedData.find((page) => page.name === 'Garantias');
	if (!oralPage || !garantiasPage)
		throw new Error('Información de "Oral" y "Garantías" incompleta.');

	// TODO: CALCULAR/SOLICITAR VALORES DE ESTAS CONSTANTES
	const TIPO_DESPACHO = 'Promiscuo Municipal';
	const DIAS_HABILES_DESPACHO = 227; // DEPENDE DEL TIPO DE DESPACHO
	const DIAS_HABILES_LABORADOS = 226; // 207; // TODO: REGISTRAR NOVEDADES CON DIAS DESCONTADOS
	const AUDIENCIAS_PROGRAMADAS = 14; //60;
	const AUDIENCIAS_ATENDIDAS = 9; // 60;
	const AUDIENCIAS_APLAZADAS_CAUSAS_AJENAS = 5; //0;
	const AUDIENCIAS_APLAZADAS_JUSTIFICADAS = 0;
	const AUDIENCIAS_APLAZADAS_NO_JUSTIFICADAS = 0;

	const oral = aggregatePageDataOral(
		funcionario,
		DIAS_HABILES_DESPACHO,
		DIAS_HABILES_LABORADOS,
		oralPage.data
	);

	const garantias = aggregatePageDataGarantias(
		funcionario,
		DIAS_HABILES_DESPACHO,
		DIAS_HABILES_LABORADOS,
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
		calificacionTotalFactorEficiencia
	};
}
