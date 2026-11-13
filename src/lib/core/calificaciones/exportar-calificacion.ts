import type { EstadoCalificacion } from '@prisma/client';
import { formatDate } from '$lib/utils/dates';

/**
 * Lo que muestra la pantalla de una calificación (factor eficiencia o
 * rendimiento), armado para exportarlo a PDF o a Excel sin tomar pantallazos.
 * Sigue las mismas reglas de la pantalla para mostrar u ocultar cada parte:
 * lo exportado dice lo mismo que se ve.
 */

type Registro = {
	funcionario: { nombre: string };
	desde: Date;
	hasta: Date;
	dias: number | null;
	inventarioInicial: number;
	ingresoEfectivo: number;
	cargaEfectiva: number;
	egresoEfectivo: number;
	conciliaciones: number;
	inventarioFinal: number;
};

type Subfactor = {
	totalInventarioInicial: number;
	cargaBaseCalificacionDespacho: number;
	cargaBaseCalificacionFuncionario: number;
	egresoFuncionario: number;
	cargaProporcional: number;
	totalSubfactor: number;
};

export type EntradaExportacion = {
	funcionario: { nombre: string; documento: string };
	despacho: { codigo: string; nombre: string };
	otrosDespachos: { codigo: string; nombre: string }[];
	calificacion: {
		periodo: number;
		estado: EstadoCalificacion;
		calificacionPonderada: number;
		calificacionTotalFactorEficiencia: number;
		cargaEfectivaTotal: number;
		egresoEfectivoTotal: number;
		diasHabilesDespacho: number;
		diasLaborables: number;
		diasDescontados: number;
		diasLaborados: number;
		factorOralMasAudiencias: number;
		calificacionAudiencias: number;
	};
	capacidadMaxima: number | null | undefined;
	novedades: { type: string; from: Date; to: Date; days: number; diasDescontables: number; notes: string | null }[];
	consolidados: { oral: Registro[]; tutelas: Registro[]; garantias: Registro[]; escrito: Registro[] };
	subfactores: { oral?: Subfactor | null; garantias?: Subfactor | null; escrito?: Subfactor | null };
	audiencias: {
		programadas: number;
		atendidas: number;
		aplazadasAjenas: number;
		aplazadasJustificadas: number;
		aplazadasNoJustificadas: number;
	} | null;
	traspaso: {
		categoria: string;
		desde: Date;
		hasta: Date;
		inventarioInicial: number;
		ingresoEfectivo: number;
		egresoEfectivo: number;
		inventarioFinal: number;
	}[];
};

/** Una cifra que la pantalla muestra con dos decimales. */
export type Decimal = { decimal: number };
export type Celda = string | number | Decimal | null;
export type Valor = { etiqueta: string; valor: Celda; resaltado?: boolean };
export type Tabla = { columnas: string[]; filas: Celda[][] };
export type Seccion = { titulo: string; nota?: string; tabla?: Tabla; valores?: Valor[] };
export type CalificacionExportada = {
	titulo: string;
	nombreArchivo: string;
	encabezado: Valor[];
	secciones: Seccion[];
};

const dec = (n: number | null | undefined): Celda => (n == null || !Number.isFinite(n) ? null : { decimal: Math.round(n * 100) / 100 });

/** Como se escribe la celda en el PDF: dos decimales donde la pantalla los pone. */
export const comoTexto = (c: Celda) => (c == null ? '' : typeof c === 'object' ? c.decimal.toFixed(2) : String(c));

const ESTADOS: Record<EstadoCalificacion, string> = {
	borrador: 'Borrador',
	revision: 'En revisión',
	aprobada: 'Aprobada',
	devuelta: 'Devuelta',
	eliminada: 'Eliminada',
	archivada: 'Archivada',
};

const conCarga = (registros: Registro[]) => registros.length > 0 && registros.some((r) => r.cargaEfectiva > 0);

const tablaConsolidado = (registros: Registro[]): Tabla => ({
	columnas: [
		'Funcionario',
		'Desde',
		'Hasta',
		'Días hábiles',
		'Inventario inicial',
		'Ingresos efectivos',
		'Carga efectiva',
		'Egresos efectivos',
		'Conciliaciones',
		'Inventario final',
	],
	filas: registros.map((r) => [
		r.funcionario.nombre,
		formatDate(r.desde),
		formatDate(r.hasta),
		r.dias,
		r.inventarioInicial,
		r.ingresoEfectivo,
		r.cargaEfectiva,
		r.egresoEfectivo,
		r.conciliaciones,
		r.inventarioFinal,
	]),
});

const valoresSubfactor = (s: Subfactor | null | undefined, ultimo: Valor[]): Valor[] => [
	{ etiqueta: 'Total inventario inicial', valor: s?.totalInventarioInicial ?? null },
	{ etiqueta: 'Carga base del despacho modificada', valor: s?.cargaBaseCalificacionDespacho ?? null },
	{ etiqueta: 'Carga base del funcionario modificada', valor: s?.cargaBaseCalificacionFuncionario ?? null },
	{ etiqueta: 'Egreso del funcionario', valor: s?.egresoFuncionario ?? null },
	{ etiqueta: 'Carga proporcional', valor: dec(s?.cargaProporcional) },
	...ultimo,
];

const dos = (n: number) => String(n).padStart(2, '0');
const horaLocal = (d: Date) =>
	`${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;

/** Nombre de archivo sin los caracteres que Windows no admite. */
const nombreSeguro = (texto: string) =>
	texto
		.replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 150);

export function exportarCalificacion(e: EntradaExportacion, generado: Date): CalificacionExportada {
	const c = e.calificacion;
	const { oral, tutelas, garantias, escrito } = e.consolidados;
	const mostrarTutelas = conCarga(tutelas);
	const mostrarOral = conCarga(oral);
	const mostrarEscrito = conCarga(escrito);
	const mostrarGarantias = conCarga(garantias);

	const total = c.calificacionTotalFactorEficiencia.toFixed(2);
	const ponderada = c.calificacionPonderada.toFixed(2);

	const encabezado: Valor[] = [
		{ etiqueta: 'Funcionario', valor: e.funcionario.nombre },
		{ etiqueta: 'Cédula', valor: e.funcionario.documento },
		{ etiqueta: 'Periodo', valor: c.periodo },
		{ etiqueta: 'Estado de la calificación', valor: ESTADOS[c.estado] ?? c.estado },
		{ etiqueta: 'Despacho', valor: `${e.despacho.codigo} - ${e.despacho.nombre}` },
		...(e.otrosDespachos.length
			? [
					{
						etiqueta: 'Otros despachos de esta calificación',
						valor: e.otrosDespachos.map((d) => `${d.codigo} - ${d.nombre}`).join('; ') + ' (cada uno se exporta desde su vista)',
					},
				]
			: []),
		{
			etiqueta: 'Generado',
			// Hora local de quien exporta. `formatDate` lee la fecha en UTC (sirve para las
			// fechas guardadas sin hora): de noche en Colombia ya daría el día siguiente.
			valor: horaLocal(generado),
		},
	];

	const secciones: Seccion[] = [];

	if (e.traspaso.length)
		secciones.push({
			titulo: 'Traspaso por cambio de código — no entra en el cálculo',
			nota:
				`El juzgado cambió de código el ${formatDate(e.traspaso[0].hasta)}. El reporte del código anterior se cerró traspasando su ` +
				`inventario al nuevo: sale como ingreso negativo y el inventario final queda en cero. Ese mismo inventario vuelve a entrar ` +
				`bajo el código nuevo, así que contarlo lo sumaría dos veces. Queda registrado, pero el cálculo empieza después.`,
			tabla: {
				columnas: ['Categoría', 'Desde', 'Hasta', 'Inv. inicial', 'Ingreso', 'Egreso', 'Inv. final'],
				filas: e.traspaso.map((t) => [
					t.categoria,
					formatDate(t.desde),
					formatDate(t.hasta),
					t.inventarioInicial,
					t.ingresoEfectivo,
					t.egresoEfectivo,
					t.inventarioFinal,
				]),
			},
		});

	secciones.push({
		titulo: 'Totales',
		valores: [
			{ etiqueta: 'Calificación factor eficiencia', valor: dec(c.calificacionTotalFactorEficiencia), resaltado: true },
			...(total !== ponderada && c.calificacionPonderada !== 0
				? [{ etiqueta: 'Calificación ponderada', valor: dec(c.calificacionPonderada), resaltado: true }]
				: []),
			{ etiqueta: 'Carga efectiva total', valor: c.cargaEfectivaTotal },
			{ etiqueta: 'Egreso efectivo total', valor: c.egresoEfectivoTotal },
			...(e.capacidadMaxima ? [{ etiqueta: 'Capacidad máxima de respuesta', valor: e.capacidadMaxima }] : []),
		],
	});

	secciones.push(
		e.novedades.length
			? {
					titulo: 'Novedades',
					tabla: {
						columnas: ['Tipo', 'Desde', 'Hasta', 'Días hábiles', 'Días descontables', 'Observaciones'],
						filas: e.novedades.map((n) => [n.type, formatDate(n.from), formatDate(n.to), n.days, n.diasDescontables, n.notes ?? '']),
					},
				}
			: { titulo: 'Novedades', nota: 'Sin novedades registradas en el periodo' }
	);

	const mostrarLaborables = !!c.diasLaborables && c.diasHabilesDespacho !== c.diasLaborables && c.diasLaborados !== c.diasLaborables;
	secciones.push({
		titulo: 'Días',
		valores: [
			{ etiqueta: 'Días hábiles del despacho', valor: c.diasHabilesDespacho },
			...(mostrarLaborables ? [{ etiqueta: 'Días laborables', valor: c.diasLaborables }] : []),
			{ etiqueta: 'Días descontados', valor: c.diasDescontados },
			{ etiqueta: 'Días laborados', valor: c.diasLaborados },
		],
	});

	if (mostrarTutelas) secciones.push({ titulo: 'Tutelas e incidentes', tabla: tablaConsolidado(tutelas) });

	const valoresOral = mostrarOral || (mostrarTutelas && !mostrarEscrito);
	if (mostrarOral || valoresOral)
		secciones.push({
			titulo: 'Oral',
			...(mostrarOral ? { tabla: tablaConsolidado(oral) } : {}),
			...(valoresOral
				? {
						valores: valoresSubfactor(e.subfactores.oral, [
							{ etiqueta: 'Subfactor respuesta efectiva', valor: dec(e.subfactores.oral?.totalSubfactor) },
							{ etiqueta: 'Calificación eficiencia + audiencias', valor: dec(c.factorOralMasAudiencias), resaltado: true },
						]),
					}
				: {}),
		});

	if (mostrarGarantias)
		secciones.push({
			titulo: 'Garantías',
			tabla: tablaConsolidado(garantias),
			valores: valoresSubfactor(e.subfactores.garantias, [
				{ etiqueta: 'Subfactor garantías', valor: dec(e.subfactores.garantias?.totalSubfactor), resaltado: true },
			]),
		});

	if (mostrarEscrito)
		secciones.push({
			titulo: 'Escrito',
			tabla: tablaConsolidado(escrito),
			valores: valoresSubfactor(e.subfactores.escrito, [
				{ etiqueta: 'Subfactor escrito', valor: dec(e.subfactores.escrito?.totalSubfactor), resaltado: true },
			]),
		});

	const a = e.audiencias;
	secciones.push({
		titulo: 'Audiencias',
		valores: [
			{ etiqueta: 'Programadas', valor: a?.programadas ?? null },
			{ etiqueta: 'Realizadas', valor: a?.atendidas ?? null },
			{ etiqueta: 'Aplazadas por causas ajenas', valor: a?.aplazadasAjenas ?? null },
			{ etiqueta: 'Aplazadas con justificación', valor: a?.aplazadasJustificadas ?? null },
			{ etiqueta: 'Aplazadas sin justificación', valor: a?.aplazadasNoJustificadas ?? null },
			{ etiqueta: 'Calificación de audiencias', valor: dec(c.calificacionAudiencias), resaltado: true },
		],
	});

	return {
		titulo: 'Calificación del factor eficiencia o rendimiento',
		nombreArchivo: nombreSeguro(`Calificacion ${c.periodo} - ${e.funcionario.nombre} - ${e.despacho.codigo}`),
		encabezado,
		secciones,
	};
}
