import { db } from '$lib/db/client';
import type {
	ClaseRegistroCalificacion,
	Despacho,
	Funcionario,
	RegistroCalificacion
} from '@prisma/client';
import dayjs from 'dayjs';
import _ from 'lodash';
import xlsx from 'node-xlsx';
import z from 'zod';

const registroCalificacionDataSchemaColumns = [
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

const registroCalificacionDataSchema = z.object({
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

type WorkbookPage = { name: string; data: unknown[][] };

type Workbook = Array<WorkbookPage>;

export const createRegistrosCalificacionFromXlsx = async (file: File) => {
	const woorkbook: Workbook = xlsx.parse(await file.arrayBuffer());
	const despachoString = woorkbook[0].data[0][0] as string;

	const despacho = await getDespachoFromXlsxFileString(despachoString);
	if (!despacho)
		throw new Error('Información de despacho no válida en el archivo de calificación.');

	const registro = await db.registroCalificacion.findFirst({
		where: { despachoId: despacho.id, periodo: 2023 }
	});
	if (registro) throw new Error('Ya existe un registro de calificaciones para este despacho.');

	const rows = woorkbook.flatMap((workbookPage) => extractWorkbookPageRows(workbookPage));

	const funcionariosByWorkbookString: Array<{ funcionarioStr: string; funcionario: Funcionario }> =
		await Promise.all(
			_(rows)
				.uniqBy('funcionario')
				.value()
				.map(async (row) => {
					return {
						funcionarioStr: row.funcionario,
						funcionario: await getFuncionarioFromXlsxFileString(row.funcionario)
					};
				}, {})
		);

	const fileData = woorkbook.flatMap(
		extractWorkbookPageData(despacho, funcionariosByWorkbookString)
	);

	await db.registroCalificacion.createMany({
		data: fileData.map((d) => ({
			cargaEfectiva: d.cargaEfectiva,
			egresoEfectivo: d.egresoEfectivo,
			ingresoEfectivo: d.ingresoEfectivo,
			inventarioFinal: d.inventarioFinal,
			inventarioInicial: d.inventarioInicial,
			restan: d.restan,
			conciliaciones: d.conciliaciones,
			desde: d.desde,
			hasta: d.hasta,
			periodo: d.periodo,
			clase: d.clase,
			categoria: d.categoria,
			despachoId: d.despachoId,
			funcionarioId: d.funcionarioId
		}))
	});
};

async function getDespachoFromXlsxFileString(despachoString: string): Promise<Despacho | null> {
	const codigoDespacho = _.last(despachoString.match(/\d{12}/));
	if (!codigoDespacho || !_.isNumber(Number(codigoDespacho)) || codigoDespacho.length !== 12)
		return null;

	let despacho = await db.despacho.findFirst({ where: { codigo: codigoDespacho } });
	if (despacho) return despacho;

	const match = despachoString.match(
		/Despacho: [0-9]+ - ([A-Za-zÁÉÍÓÚáéíóú0-9]+( [A-Za-zÁÉÍÓÚáéíóú0-9]+)+)/
	);

	return db.despacho.create({
		data: {
			codigo: codigoDespacho,
			nombre: _.startCase(match?.[1] || `Despacho ${codigoDespacho}`)
		}
	});
}

async function getFuncionarioFromXlsxFileString(funcionarioString: string): Promise<Funcionario> {
	const nombre = _.get(funcionarioString.match(/Funcionario: ([A-Za-z]+( [A-Za-z]+)+) /), 1) || '';
	const documento = _.first(funcionarioString.match(/[0-9]+$/)) || '';
	let funcionario = await db.funcionario.findFirst({ where: { documento } });
	if (funcionario) return funcionario;
	return db.funcionario.create({
		data: { nombre: nombre.trim().toUpperCase(), documento: documento.trim() }
	});
}

function extractWorkbookPageRows(workbookPage: WorkbookPage) {
	return workbookPage.data
		.map((data) => consolidadoRowSchema.safeParse(data))
		.filter((parsed) => parsed.success)
		.map((parsed) => parsed.data!.filter((value) => value !== undefined))
		.map((data) => {
			return {
				...registroCalificacionDataSchema.parse(
					_.zipObject(registroCalificacionDataSchemaColumns, data)
				),
				clase: workbookPage.name.toLowerCase() as ClaseRegistroCalificacion
			};
		});
}

function extractWorkbookPageData(
	despacho: Despacho,
	funcionarios: Array<{ funcionarioStr: string; funcionario: Funcionario }>
) {
	return (workbookPage: WorkbookPage): Omit<RegistroCalificacion, 'id'>[] => {
		const rows = extractWorkbookPageRows(workbookPage);
		return rows.flatMap(({ funcionario: funcionarioStr, ...data }) => {
			const funcionario = funcionarios.find(
				(f) => f.funcionarioStr === funcionarioStr
			)?.funcionario!;
			return {
				...data,
				despachoId: despacho.id,
				funcionarioId: funcionario.id,
				periodo: dayjs(data.desde).year()
			};
		});
	};
}
