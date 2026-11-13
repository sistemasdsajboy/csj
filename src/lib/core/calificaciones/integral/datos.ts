import { db } from '$lib/server/db-client';
import { normalizarNombre } from '$lib/utils/normalizar-nombre';
import type { Funcionario, Genero, NovedadFuncionario, RegistroCalificacion } from '@prisma/client';
import { descartarAsientosDeCierre } from '../asiento-de-cierre';
import type { DespachoEficiencia, SubfactorEficiencia } from './motivacion-eficiencia';
import { fechaCorta, letrasYCifraDelante } from './redaccion';

/**
 * Reúne desde la base lo que el formato de calificación integral toma del
 * sistema: identificación del funcionario y el cálculo del factor eficiencia.
 */

const TIPOS_NOVEDAD: Record<string, string> = {
	calamidad: 'calamidad doméstica',
	'cierre-extraordinario': 'cierre extraordinario del despacho',
	comision: 'comisión de servicios',
	escrutinios: 'escrutinios',
	incapacidad: 'incapacidad',
	licencia: 'licencia',
	'permiso-ejrlb': 'permiso para actividades de la Escuela Judicial Rodrigo Lara Bonilla',
	'permiso-sindical': 'permiso sindical',
	vacaciones: 'vacaciones',
	otras: 'otras novedades',
};

/** Frase propuesta para los días descontados, a partir de las novedades con días descontables. */
export function fraseDescuentos(novedades: Pick<NovedadFuncionario, 'type' | 'from' | 'to' | 'diasDescontables'>[]): string | null {
	const partes = novedades
		.filter((n) => n.diasDescontables > 0)
		.sort((a, b) => a.from.getTime() - b.from.getTime())
		.map(
			(n) =>
				`${letrasYCifraDelante(n.diasDescontables)} ${n.diasDescontables === 1 ? 'día' : 'días'} de ${TIPOS_NOVEDAD[n.type] ?? n.type} ` +
				`(del ${fechaCorta(n.from)} al ${fechaCorta(n.to)})`
		);
	if (!partes.length) return null;
	return partes.length === 1 ? partes[0] : partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
}

/**
 * Propuesta de nombres y apellidos a partir del nombre completo: los dos
 * últimos son los apellidos. Falla con apellidos compuestos ("De la Hoz"), por
 * eso solo se propone y se corrige a mano una vez.
 */
export function separarNombre(nombre: string): { nombres: string; apellidos: string } {
	const p = nombre.trim().split(/\s+/);
	if (p.length <= 1) return { nombres: nombre.trim(), apellidos: '' };
	const corte = p.length === 2 ? 1 : p.length - 2;
	return { nombres: p.slice(0, corte).join(' '), apellidos: p.slice(corte).join(' ') };
}

/** Parte el nombre completo dejando las últimas `palabrasApellidos` palabras como apellidos. Null si no se puede. */
export function separarEn(nombre: string, palabrasApellidos: number): { nombres: string; apellidos: string } | null {
	const p = nombre.trim().split(/\s+/);
	if (!Number.isInteger(palabrasApellidos) || palabrasApellidos < 1 || palabrasApellidos >= p.length) return null;
	return { nombres: p.slice(0, -palabrasApellidos).join(' '), apellidos: p.slice(-palabrasApellidos).join(' ') };
}

/** Todas las formas de partir el nombre en nombres y apellidos. El nombre viene del sistema: no se cambia ninguna letra. */
export function cortesDelNombre(nombre: string) {
	const n = nombre.trim().split(/\s+/).length;
	return Array.from({ length: Math.max(n - 1, 0) }, (_, i) => ({ palabrasApellidos: i + 1, ...separarEn(nombre, i + 1)! }));
}

/**
 * Cédula real. Los encargos se registran con la cédula más un dígito (H-18):
 * si existe otro registro con el mismo nombre y esa cédula sin el último
 * dígito, la real es esa.
 */
export function cedulaReal(f: Pick<Funcionario, 'documento' | 'nombre'>, otros: Pick<Funcionario, 'documento' | 'nombre'>[]): string {
	const base = f.documento.slice(0, -1);
	const titular = otros.find((o) => o.documento === base && normalizarNombre(o.nombre) === normalizarNombre(f.nombre));
	return titular ? titular.documento : f.documento;
}

type Fila = Pick<RegistroCalificacion, 'clase' | 'egresoEfectivo' | 'conciliaciones'>;
const suma = (filas: Fila[], clase: string, campo: 'egresoEfectivo' | 'conciliaciones') =>
	filas.filter((r) => r.clase === clase).reduce((s, r) => s + r[campo], 0);

/** Desglose del egreso de un subfactor; null si no cuadra con el egreso guardado. */
function desglose(egreso: number, principal: number, tutelas: number, conciliaciones: number): SubfactorEficiencia['desglose'] {
	return Math.abs(principal + tutelas + conciliaciones - egreso) < 1e-6 ? { principal, tutelas, conciliaciones } : null;
}

export async function datosDelFuncionario(funcionarioId: string) {
	const f = await db.funcionario.findFirstOrThrow({ where: { id: funcionarioId } });
	const mismos = await db.funcionario.findMany({ where: { NOT: { id: f.id } }, select: { documento: true, nombre: true } });
	// Lo guardado solo vale si es una forma de partir el nombre del sistema; si no, la propuesta.
	const guardado = f.nombres && f.apellidos ? separarEn(f.nombre, f.apellidos.trim().split(/\s+/).length) : null;
	const vigente = guardado && guardado.nombres === f.nombres!.trim() && guardado.apellidos === f.apellidos!.trim() ? guardado : null;
	const { nombres, apellidos } = vigente ?? separarNombre(f.nombre);
	return {
		id: f.id,
		nombre: f.nombre,
		nombres,
		apellidos,
		palabrasApellidos: apellidos ? apellidos.split(/\s+/).length : 0,
		nombresGuardados: vigente != null,
		genero: f.genero as Genero | null,
		cedula: cedulaReal(f, mismos),
	};
}

/** Datos del factor eficiencia de una calificación, uno por despacho. */
export async function datosEficiencia(calificacionId: string) {
	const cp = await db.calificacionPeriodo.findFirstOrThrow({
		where: { id: calificacionId },
		include: {
			calificaciones: {
				include: {
					despacho: { include: { tipoDespacho: { include: { capacidadesMaximas: true } } } },
					subfactores: true,
					registroAudiencias: true,
				},
			},
		},
	});
	const unico = cp.calificaciones.length === 1;
	const despachos: DespachoEficiencia[] = [];

	for (const cd of cp.calificaciones) {
		const delDespacho = await db.registroCalificacion.findMany({
			where: { despachoId: cd.despachoId, periodo: cp.periodo, categoria: { not: 'Consolidado' } },
		});
		const { conservados } = descartarAsientosDeCierre(delDespacho);
		const propias = conservados.filter((r) => r.funcionarioId === cp.funcionarioId);
		const conEscritos = conservados.some((r) => r.clase === 'escrito' && r.cargaEfectiva > 0);
		const sub = (nombre: string) => cd.subfactores.find((s) => s.subfactor === nombre);
		const subfactor = (nombre: string, principal: string, conTutelas: boolean): SubfactorEficiencia | null => {
			const s = sub(nombre);
			if (!s) return null;
			const tutelas = conTutelas ? suma(propias, 'tutelas', 'egresoEfectivo') : 0;
			const conc = suma(propias, principal, 'conciliaciones') + (conTutelas ? suma(propias, 'tutelas', 'conciliaciones') : 0);
			return {
				cargaDespacho: s.cargaBaseCalificacionDespacho,
				cargaFuncionario: s.cargaBaseCalificacionFuncionario,
				cargaProporcional: s.cargaProporcional,
				egreso: s.egresoFuncionario,
				total: s.totalSubfactor,
				desglose: desglose(s.egresoFuncionario, suma(propias, principal, 'egresoEfectivo'), tutelas, conc),
			};
		};
		const novedades = await db.novedadFuncionario.findMany({
			where: {
				funcionarioId: cp.funcionarioId,
				despachoId: cd.despachoId,
				from: { lte: new Date(Date.UTC(cp.periodo, 11, 31)) },
				to: { gte: new Date(Date.UTC(cp.periodo, 0, 1)) },
			},
		});
		const fechas = propias.map((r) => r.desde.getTime());
		const finales = propias.map((r) => r.hasta.getTime());
		const a = cd.registroAudiencias;
		despachos.push({
			nombre: cd.despacho.nombre,
			desde: unico || !fechas.length ? new Date(Date.UTC(cp.periodo, 0, 1)) : new Date(Math.min(...fechas)),
			hasta: unico || !finales.length ? new Date(Date.UTC(cp.periodo, 11, 31)) : new Date(Math.max(...finales)),
			diasHabilesDespacho: cd.diasHabilesDespacho,
			diasLaborables: cd.diasLaborables,
			diasLaborados: cd.diasLaborados,
			descuentos: fraseDescuentos(novedades),
			cargaEfectivaTotal: cd.cargaEfectivaTotal,
			egresoEfectivoTotal: cd.egresoEfectivoTotal,
			capacidad: cd.despacho.tipoDespacho?.capacidadesMaximas.find((c) => c.periodo === cp.periodo)?.cantidad ?? null,
			conEscritos,
			oral: subfactor('oral', 'oral', !conEscritos),
			escrito: subfactor('escrito', 'escrito', conEscritos),
			garantias: subfactor('garantias', 'garantias', false),
			audiencias: a
				? {
						programadas: a.programadas,
						atendidas: a.atendidas,
						ajenas: a.aplazadasAjenas,
						justificadas: a.aplazadasJustificadas,
						noJustificadas: a.aplazadasNoJustificadas,
						puntaje: cd.calificacionAudiencias,
					}
				: null,
			oralMasAudiencias: cd.factorOralMasAudiencias,
			total: cd.calificacionTotalFactorEficiencia,
		});
	}
	return { periodo: cp.periodo, ponderada: cp.calificacionPonderada, despachos };
}
