import { db } from '$lib/server/db-client';
import type { ClaseRegistroCalificacion, Despacho, Funcionario, RegistroCalificacion } from '@prisma/client';
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
	'restan',
	'cargaBruta',
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
	restan: z.number(),
	cargaBruta: z.number().default(0),
});

const formatearFechaXlsx = (dateStr: string) => {
	return dateStr
		.replace(/[^A-Z0-9\/]/gi, '')
		.replace('ENE', 'JAN')
		.replace('ABR', 'APR')
		.replace('AGO', 'AUG')
		.replace('DIC', 'DEC');
};

const consolidadoRowSchema = z.tuple([
	z.string(),
	z.string(),
	z.coerce.string().transform(formatearFechaXlsx).pipe(z.coerce.date({})),
	z.coerce.string().transform(formatearFechaXlsx).pipe(z.coerce.date()),
	z.number(),
	z.number(),
	z.number(),
	z.number(),
	z.number(),
	z.number(),
	z.undefined(),
	z.undefined(),
	z.number(),
	z.number(),
]);

type WorkbookPage = { name: string; data: unknown[][] };

type Workbook = Array<WorkbookPage>;

export const createRegistrosCalificacionFromXlsx = async (file: File) => {
	const { woorkbook, despacho } = await workbookFromXlsxFile(file);
	const fileData = await fileDataFromWorkbook(woorkbook, despacho);

	try {
		const { count: countEliminados } = await db.registroCalificacion.deleteMany({
			where: {
				despachoId: despacho.id,
				periodo: fileData[0].periodo,
				categoria: { not: 'Consolidado' },
			},
		});

		const { count: countCreados } = await db.registroCalificacion.createMany({
			data: fileData.map((d) => ({
				cargaEfectiva: d.cargaEfectiva,
				egresoEfectivo: d.egresoEfectivo,
				ingresoEfectivo: d.ingresoEfectivo,
				inventarioFinal: d.inventarioFinal,
				inventarioInicial: d.inventarioInicial,
				restan: d.restan,
				cargaBruta: d.cargaBruta,
				conciliaciones: d.conciliaciones,
				desde: d.desde,
				hasta: d.hasta,
				periodo: d.periodo,
				clase: d.clase,
				categoria: d.categoria.replaceAll('.', ''),
				despachoId: d.despachoId,
				funcionarioId: d.funcionarioId,
			})),
		});

		return { countCreados, countEliminados, despacho: despacho.nombre, periodo: fileData[0].periodo };
	} catch (error) {
		throw new Error(
			'Ocurrió un error durante la actualización de los registros en la base de datos. Por favor vuelva a cargar el archivo consolidado.'
		);
	}
};

async function workbookFromXlsxFile(file: File): Promise<{ woorkbook: Workbook; despacho: Despacho }> {
	try {
		const woorkbook: Workbook = xlsx.parse(await file.arrayBuffer());
		const despachoString = woorkbook[0].data[0][0] as string;

		const despacho: Despacho | null = await getDespachoFromXlsxFileString(despachoString);
		if (!despacho) throw new Error();
		return { woorkbook, despacho };
	} catch (error) {
		throw new Error('Información de despacho no válida en el archivo de calificación.');
	}
}

async function fileDataFromWorkbook(
	woorkbook: Workbook,
	despacho: Despacho
): Promise<Omit<RegistroCalificacion, 'id' | 'dias' | 'calificacionId'>[]> {
	try {
		const rows = woorkbook.flatMap((workbookPage) => extractWorkbookPageRows(workbookPage));

		const funcionariosByWorkbookString: Array<{ funcionarioStr: string; funcionario: Funcionario }> = await Promise.all(
			_(rows)
				.uniqBy('funcionario')
				.value()
				.map(async (row) => {
					return {
						funcionarioStr: row.funcionario,
						funcionario: await getFuncionarioFromXlsxFileString(row.funcionario),
					};
				}, {})
		);
		const fileData = woorkbook.flatMap(extractWorkbookPageData(despacho, funcionariosByWorkbookString));
		if (!fileData.length) throw new Error();

		return fileData;
	} catch (error) {
		throw new Error('El archivo no contiene información para cargar o no se reconoce el formato del contenido.');
	}
}

async function getDespachoFromXlsxFileString(despachoString: string): Promise<Despacho | null> {
	// Eliminar espacios múltiples
	despachoString = despachoString.replace(/\s{2,}/g, ' ');

	const codigoDespacho = _.last(despachoString.match(/\d{12}/));
	if (!codigoDespacho || !_.isNumber(Number(codigoDespacho)) || codigoDespacho.length !== 12) return null;

	let despacho = await db.despacho.findFirst({ where: { codigo: codigoDespacho } });
	if (despacho) return despacho;

	const match = despachoString.match(/Despacho: [0-9]+ - ([A-Za-zñÑÁÉÍÓÚáéíóúÜü0-9]+( [A-Za-zñÑÁÉÍÓÚáéíóúÜü0-9]+)+)/);

	return db.despacho.create({
		data: {
			codigo: codigoDespacho,
			nombre: _.startCase(match?.[1] || `Despacho ${codigoDespacho}`),
		},
	});
}

async function getFuncionarioFromXlsxFileString(funcionarioString: string): Promise<Funcionario> {
	// Eliminar espacios múltiples
	const funcionarioStringMatch = funcionarioString
		.replace(/\s{2,}/g, ' ')
		.match(/Funcionario: ([A-Za-zñÑÁÉÍÓÚáéíóúÜü]+( [A-Za-zñÑÁÉÍÓÚáéíóúÜü]+)+) /);

	const nombre = _.get(funcionarioStringMatch, 1) || '';
	const documento = _.first(funcionarioString.match(/[0-9]+$/)) || '';
	let funcionario = await db.funcionario.findFirst({ where: { documento } });
	if (funcionario) return funcionario;
	return db.funcionario.create({
		data: { nombre: nombre.trim().toUpperCase(), documento: documento.trim() },
	});
}

function extractWorkbookPageRows(workbookPage: WorkbookPage) {
	return (
		workbookPage.data
			// Completar con 0 en la última columna las filas del formato de consolidado antiguo
			.map((row) => (row.length === 13 ? [...row, 0] : row))
			.map((row) => consolidadoRowSchema.safeParse(row))
			.filter((parsed) => parsed.success)
			.map((parsed) => parsed.data!.filter((value) => value !== undefined))
			.map((data) => {
				return {
					...registroCalificacionDataSchema.parse(_.zipObject(registroCalificacionDataSchemaColumns, data)),
					// .normalize y .replace eliminan los caracteres acentuados.
					clase: workbookPage.name
						.toLowerCase()
						.normalize('NFKD')
						.replace(/[\u0300-\u036f]/g, '') as ClaseRegistroCalificacion,
				};
			})
	);
}

function extractWorkbookPageData(despacho: Despacho, funcionarios: Array<{ funcionarioStr: string; funcionario: Funcionario }>) {
	return (workbookPage: WorkbookPage): Omit<RegistroCalificacion, 'id' | 'dias' | 'calificacionId'>[] => {
		const rows = extractWorkbookPageRows(workbookPage);
		return rows.flatMap(({ funcionario: funcionarioStr, ...data }) => {
			const funcionario = funcionarios.find((f) => f.funcionarioStr === funcionarioStr)?.funcionario!;
			return {
				...data,
				despachoId: despacho.id,
				funcionarioId: funcionario.id,
				periodo: dayjs(data.desde).year(),
			};
		});
	};
}
