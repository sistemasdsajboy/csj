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

/**
 * Un juzgado que cambia de código no puede terminar con dos registros de
 * despacho: eso parte su historial en dos, el cálculo cree que el funcionario
 * se trasladó a mitad de año y produce dos calificaciones parciales en vez de
 * una del periodo completo.
 *
 * Por eso, cuando el código del archivo no corresponde a ningún despacho, se
 * busca también por nombre antes de crear uno nuevo.
 */
type DespachoCandidato = { id: string; codigo: string; nombre: string; ultimoRegistro: Date | null };

type DecisionDespacho =
	| { accion: 'usar'; id: string; aviso?: string }
	| { accion: 'actualizarCodigo'; id: string; codigoAnterior: string; aviso?: string }
	| { accion: 'crear'; aviso?: string };

/**
 * Deja el nombre en una forma comparable: sin tildes, sin signos y en
 * mayúsculas. Los nombres se guardan pasados por `_.startCase`, pero algunos
 * se editan a mano desde la interfaz y no conviene que una tilde o un espacio
 * de más vuelvan a partir un juzgado.
 */
export const normalizarNombreDespacho = (nombre: string) =>
	nombre
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.toUpperCase();

/**
 * Despachos que podrían ser el del archivo: el del mismo código, y los que
 * comparten nombre. Función pura, para poder consultar la base una sola vez.
 */
export const candidatosDeDespacho = <T extends { codigo: string; nombre: string }>(
	archivo: { codigo: string; nombre: string },
	despachos: T[]
): T[] => {
	const nombre = normalizarNombreDespacho(archivo.nombre);
	return despachos.filter((d) => d.codigo === archivo.codigo || (!!nombre && normalizarNombreDespacho(d.nombre) === nombre));
};

/**
 * Decide qué hacer con el despacho del archivo. Función pura: no consulta la
 * base, para que cada rama pueda comprobarse en las pruebas.
 *
 * `fecha` es la fecha final más reciente del archivo, y `ultimoRegistro` la del
 * último registro ya cargado del despacho. El criterio de vigencia —confirmado
 * con el área y ya aplicado por `scripts/fusionar-despachos.mjs`— es que el
 * código vigente es el de los datos más recientes. De ahí que un archivo
 * histórico se adjunte al despacho existente pero no le cambie el código.
 */
export const decidirDespacho = (
	archivo: { codigo: string; nombre: string; fecha: Date | null },
	candidatos: DespachoCandidato[]
): DecisionDespacho => {
	const nombre = normalizarNombreDespacho(archivo.nombre);
	const porNombre = nombre ? candidatos.filter((d) => normalizarNombreDespacho(d.nombre) === nombre) : [];

	// Mientras un juzgado tenga más de un registro su historial sigue partido,
	// aunque esta carga se adjunte al correcto. Se avisa en vez de rechazar el
	// archivo: la fusión no la puede ejecutar quien lo sube.
	const aviso =
		porNombre.length > 1
			? `Atención: el juzgado ${porNombre[0].nombre} tiene ${porNombre.length} registros en el sistema ` +
				`(códigos ${porNombre.map((d) => d.codigo).join(', ')}). Su historial está partido entre ellos y su ` +
				`calificación puede calcularse sobre un periodo incompleto. Hay que unificarlos.`
			: undefined;

	const porCodigo = candidatos.find((d) => d.codigo === archivo.codigo);
	if (porCodigo) return { accion: 'usar', id: porCodigo.id, aviso };

	if (!porNombre.length) return { accion: 'crear' };

	const enMilis = (fecha: Date | null) => fecha?.getTime() ?? 0;
	const [elegido] = [...porNombre].sort((a, b) => enMilis(b.ultimoRegistro) - enMilis(a.ultimoRegistro));

	// Solo se cambia el código cuando hay prueba de que el archivo es posterior a
	// lo ya registrado. Un despacho sin registros previos no da con qué comparar,
	// y bajarle el código por un archivo viejo sería peor que dejarlo como está.
	if (archivo.fecha && elegido.ultimoRegistro && archivo.fecha > elegido.ultimoRegistro)
		return { accion: 'actualizarCodigo', id: elegido.id, codigoAnterior: elegido.codigo, aviso };

	// Archivo histórico: se adjunta al despacho existente, sin retroceder el código.
	return { accion: 'usar', id: elegido.id, aviso };
};

export const createRegistrosCalificacionFromXlsx = async (file: File) => {
	const { woorkbook, despacho, avisos } = await workbookFromXlsxFile(file);
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

		return { countCreados, countEliminados, despacho: despacho.nombre, periodo: fileData[0].periodo, avisos };
	} catch (error) {
		throw new Error(
			'Ocurrió un error durante la actualización de los registros en la base de datos. Por favor vuelva a cargar el archivo consolidado.'
		);
	}
};

async function workbookFromXlsxFile(file: File): Promise<{ woorkbook: Workbook; despacho: Despacho; avisos: string[] }> {
	let woorkbook: Workbook;
	let despachoString: unknown;
	try {
		woorkbook = xlsx.parse(await file.arrayBuffer());
		despachoString = woorkbook[0].data[0][0];
	} catch (error) {
		throw new Error('Información de despacho no válida en el archivo de calificación.');
	}
	if (typeof despachoString !== 'string') throw new Error('Información de despacho no válida en el archivo de calificación.');

	// Fuera del try: si lo que falla es la base de datos, decirle al usuario que
	// el archivo no es válido lo manda a corregir donde no está el problema.
	const resuelto = await getDespachoFromXlsxFileString(despachoString, fechaMasRecienteDelArchivo(woorkbook));
	if (!resuelto) throw new Error('Información de despacho no válida en el archivo de calificación.');

	return { woorkbook, ...resuelto };
}

/**
 * Fecha final más reciente del archivo. Sirve para saber si sus datos son
 * posteriores a los ya cargados y, por tanto, si el código que trae el archivo
 * es el vigente del juzgado.
 */
function fechaMasRecienteDelArchivo(woorkbook: Workbook): Date | null {
	const fechas = woorkbook.flatMap(extractWorkbookPageRows).map((row) => row.hasta.getTime());
	return fechas.length ? new Date(Math.max(...fechas)) : null;
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

/**
 * Resuelve a qué despacho pertenece el archivo, sin volver a partir juzgados
 * que cambiaron de código. El criterio está en `decidirDespacho`.
 */
async function getDespachoFromXlsxFileString(
	despachoString: string,
	fechaArchivo: Date | null
): Promise<{ despacho: Despacho; avisos: string[] } | null> {
	// Eliminar espacios múltiples
	despachoString = despachoString.replace(/\s{2,}/g, ' ');

	const codigo = _.last(despachoString.match(/\d{12}/));
	if (!codigo || codigo.length !== 12) return null;

	const match = despachoString.match(/Despacho: [0-9]+ - ([A-Za-zñÑÁÉÍÓÚáéíóúÜü0-9]+( [A-Za-zñÑÁÉÍÓÚáéíóúÜü0-9]+)+)/);
	const nombre = _.startCase(match?.[1] || `Despacho ${codigo}`);

	const candidatos = candidatosDeDespacho({ codigo, nombre }, await db.despacho.findMany());
	const conUltimoRegistro = await Promise.all(candidatos.map(async (d) => ({ ...d, ultimoRegistro: await ultimoRegistroDe(d.id) })));

	const decision = decidirDespacho({ codigo, nombre, fecha: fechaArchivo }, conUltimoRegistro);
	const avisos = decision.aviso ? [decision.aviso] : [];

	if (decision.accion === 'crear') return { despacho: await db.despacho.create({ data: { codigo, nombre } }), avisos };

	if (decision.accion === 'usar') return { despacho: candidatos.find((d) => d.id === decision.id)!, avisos };

	// El juzgado cambió de código: se actualiza el registro que ya existe en vez
	// de crear otro, para que su historial quede completo bajo un solo despacho.
	const despacho = await db.despacho.update({ where: { id: decision.id }, data: { codigo } });
	avisos.push(
		`El juzgado ${despacho.nombre} cambió de código: ${decision.codigoAnterior} → ${codigo}. ` +
			`Se actualizó el despacho que ya existía, en vez de crear uno nuevo, para no partir su historial.`
	);
	return { despacho, avisos };
}

/**
 * Fecha del último registro de estadísticas del despacho. Es el mismo criterio
 * de vigencia que aplica `scripts/fusionar-despachos.mjs`.
 */
async function ultimoRegistroDe(despachoId: string): Promise<Date | null> {
	const registro = await db.registroCalificacion.findFirst({
		where: { despachoId },
		orderBy: { hasta: 'desc' },
		select: { hasta: true },
	});
	return registro?.hasta ?? null;
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
