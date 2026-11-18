import type { Genero } from '@prisma/client';
import { cantidad, cifra, fechaCorta, letrasYCifraDelante, nombreDespacho, palabras, type Palabras } from './redaccion';

/** Una novedad con días descontados: los días salen de la novedad; la descripción se puede modificar. */
export type DescuentoNovedad = { novedadId: string; dias: number; descripcion: string };

/** "un (1) día de", "seis (6) días de": la parte fija, que sale de la novedad. */
export const prefijoDescuento = (dias: number) => `${letrasYCifraDelante(dias)} ${dias === 1 ? 'día' : 'días'} de`;

/** Junta las novedades en una frase: "dos (2) días de ..., un (1) día de ... y ...". */
export function fraseDeDescuentos(items: Pick<DescuentoNovedad, 'dias' | 'descripcion'>[]): string | null {
	const partes = items.map((i) => `${prefijoDescuento(i.dias)} ${i.descripcion}`);
	if (!partes.length) return null;
	return partes.length === 1 ? partes[0] : partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
}

/**
 * Motivación del factor eficiencia o rendimiento, con la redacción del
 * documento "Argumentos para motivar" del despacho 2. Todo dato sale del
 * cálculo guardado por el sistema.
 *
 * El documento trae un solo caso: la carga proporcional es la base y no supera
 * la capacidad máxima. El cálculo tiene más (art. 39 y 45 del Acuerdo
 * PSAA16-10618): cuando la capacidad máxima proporcional es menor, cuando la
 * carga del funcionario es menor que la proporcional, y cuando el egreso
 * supera la base y el subfactor llega al tope. Para esos casos se agregaron
 * párrafos con la misma forma de redacción; la variante se elige con la misma
 * regla que usó el cálculo.
 */

export type SubfactorEficiencia = {
	cargaDespacho: number;
	cargaFuncionario: number;
	cargaProporcional: number;
	egreso: number;
	total: number;
	/** Desglose del egreso; null si no se pudo reconstruir y cuadrar con el egreso guardado. */
	desglose: { principal: number; tutelas: number; conciliaciones: number } | null;
};

export type AudienciasEficiencia = {
	programadas: number;
	atendidas: number;
	ajenas: number;
	justificadas: number;
	noJustificadas: number;
	puntaje: number;
};

export type DespachoEficiencia = {
	nombre: string;
	desde: Date;
	hasta: Date;
	diasHabilesDespacho: number;
	diasLaborables: number;
	diasLaborados: number;
	descuentos: string | null;
	/** Las novedades que componen `descuentos`, una por una (para modificar su descripción). */
	descuentosDetalle?: DescuentoNovedad[];
	cargaEfectivaTotal: number;
	egresoEfectivoTotal: number;
	capacidad: number | null;
	/** El despacho tiene procesos escritos: las tutelas se suman al subfactor escrito. */
	conEscritos: boolean;
	/**
	 * Despacho con función de control de garantías (`esDespachoDeGarantias`): el
	 * subfactor oral se califica sobre 45 y no se califica la atención de audiencias.
	 */
	esGarantias?: boolean;
	oral: SubfactorEficiencia | null;
	escrito: SubfactorEficiencia | null;
	garantias: SubfactorEficiencia | null;
	audiencias: AudienciasEficiencia | null;
	oralMasAudiencias: number;
	total: number;
};

const tieneDatos = (s: SubfactorEficiencia | null): s is SubfactorEficiencia =>
	!!s && (s.cargaDespacho !== 0 || s.cargaFuncionario !== 0 || s.egreso !== 0 || s.total !== 0);

export type Base = { tipo: 'proporcional' | 'funcionario' | 'capacidad'; valor: number; capacidadProporcional: number | null };

/**
 * La base sobre la que se calificó, con la misma regla de `generadorResultadosSubfactor`:
 * la menor entre la carga proporcional, la carga del funcionario (si no es
 * negativa) y la capacidad máxima proporcional (solo en el subfactor oral).
 */
export function baseDelSubfactor(s: SubfactorEficiencia, d: DespachoEficiencia, conCapacidad: boolean): Base {
	const capacidadProporcional =
		conCapacidad && d.capacidad && d.diasHabilesDespacho > 0 ? (d.capacidad * d.diasLaborados) / d.diasHabilesDespacho : null;
	const propia = s.cargaFuncionario < 0 ? Infinity : s.cargaFuncionario;
	const cap = capacidadProporcional ?? Infinity;
	const valor = Math.min(s.cargaProporcional, propia, cap);
	const tipo = valor === s.cargaProporcional ? 'proporcional' : valor === cap ? 'capacidad' : 'funcionario';
	return { tipo, valor, capacidadProporcional };
}

function parrafosSubfactor(
	s: SubfactorEficiencia,
	d: DespachoEficiencia,
	p: Palabras,
	o: { maximo: 40 | 45; conCapacidad: boolean; principal: string; conTutelas: boolean }
): string[] {
	const base = baseDelSubfactor(s, d, o.conCapacidad);
	const capacidadTxt = d.capacidad != null ? `${cantidad(d.capacidad)} procesos` : 'sin capacidad registrada';

	const datos =
		`Carga base para la calificación del despacho: ${cantidad(s.cargaDespacho)} procesos. Carga base para la calificación ` +
		`${p.del} ${p.funcionario}: ${cantidad(s.cargaFuncionario)} procesos. Egreso base para la calificación ${p.del} ` +
		`${p.funcionario}: ${cantidad(s.egreso)} procesos. ` +
		(base.tipo === 'capacidad'
			? `Capacidad Máxima de respuesta proporcional al tiempo laborado: ${cifra(base.capacidadProporcional!)} procesos. `
			: o.conCapacidad
				? `Capacidad Máxima de respuesta: NA. `
				: `Capacidad Máxima de respuesta: ${capacidadTxt}. `) +
		`Carga proporcional al tiempo laborado por ${p.el} ${p.funcionario}: ${cifra(s.cargaProporcional)} procesos.`;

	const egreso = (() => {
		const g = s.desglose;
		if (!g) return `El egreso base para la calificación es de ${cantidad(s.egreso)} procesos`;
		const partes = [`${cantidad(g.principal)} egresos ${o.principal}`];
		if (o.conTutelas)
			partes.push(`${cantidad(g.tutelas)} de acciones de tutela e incidentes de desacato registrados por ${p.el} ${p.funcionario}`);
		const conc = g.conciliaciones
			? ` más ${cantidad(g.conciliaciones)} ${g.conciliaciones === 1 ? 'conciliación que se contabiliza' : 'conciliaciones que se contabilizan'} doble`
			: '';
		return `El egreso base para la calificación es de ${cantidad(s.egreso)} procesos, que corresponden a ${partes.join(' y ')}${conc}`;
	})();

	const supera = d.capacidad != null && base.valor > d.capacidad;
	let subfactor: string;
	let formula: string;
	if (base.tipo === 'capacidad') {
		subfactor =
			`Subfactor Respuesta Efectiva a la demanda de justicia: la carga proporcional al tiempo laborado por ${p.el} ` +
			`${p.funcionario} es de ${cifra(s.cargaProporcional)} procesos y supera la capacidad máxima de respuesta proporcional al ` +
			`tiempo laborado, que es de ${cifra(base.valor)} procesos; por ello, la carga base para la calificación corresponde a la ` +
			`capacidad máxima de respuesta, esto es: ${cifra(base.valor)} procesos. ${egreso}. Como la carga supera la capacidad máxima ` +
			`de respuesta, se aplica la fórmula del literal b del artículo 39 del Acuerdo, en concordancia con su artículo 45:`;
		formula = `(Egreso base de calificación / Capacidad máxima de respuesta) × ${o.maximo} = puntaje subfactor`;
	} else {
		const queBase =
			base.tipo === 'funcionario'
				? `la carga base para la calificación corresponde a la carga base para la calificación ${p.del} ${p.funcionario}, por ser ` +
					`inferior a la carga proporcional al tiempo laborado (${cifra(s.cargaProporcional)} procesos), esto es: ${cantidad(base.valor)} procesos`
				: `la carga base para la calificación corresponde a la carga proporcional al tiempo laborado por ${p.el} ${p.funcionario}, ` +
					`esto es: ${cifra(base.valor)} procesos`;
		const capacidad =
			d.capacidad == null || supera
				? `se aplica la ${o.maximo === 40 ? 'fórmula del artículo 39 del Acuerdo' : 'siguiente fórmula'}:`
				: `Como la carga no supera la capacidad máxima de respuesta (${capacidadTxt}), se aplica la ${o.maximo === 40 ? 'fórmula del artículo 39 del Acuerdo' : 'siguiente fórmula'}:`;
		subfactor = `Subfactor Respuesta Efectiva a la demanda de justicia: ${queBase}. ${egreso}. ${capacidad.charAt(0).toUpperCase() + capacidad.slice(1)}`;
		formula = `(Egreso base de calificación / Carga base de calificación) × ${o.maximo} = puntaje subfactor`;
	}

	// Con la carga redondeada a dos decimales, rehacer la cuenta a mano puede dar
	// una centésima distinta del puntaje (que se calcula con la carga completa).
	// En ese caso la fórmula muestra la carga con cuatro decimales.
	const valorBase = (() => {
		if (base.tipo === 'funcionario') return cantidad(base.valor);
		// Sin tope: con tope la línea muestra primero el cociente y luego el máximo.
		const puntaje = (carga: number) => cifra((s.egreso / carga) * o.maximo);
		return puntaje(Math.round(base.valor * 100) / 100) === puntaje(base.valor) ? cifra(base.valor) : cifra(base.valor, 4);
	})();
	let resultado: string;
	if (base.valor <= 0) {
		resultado = `Como la carga base para la calificación es de cero procesos, el puntaje del subfactor es de ${cifra(0)} puntos.`;
	} else {
		const crudo = (s.egreso / base.valor) * o.maximo;
		resultado = `(${cantidad(s.egreso)} / ${valorBase}) × ${o.maximo} = ${cifra(Math.min(crudo, o.maximo))}`;
		if (crudo > o.maximo + 1e-9)
			resultado =
				`(${cantidad(s.egreso)} / ${valorBase}) × ${o.maximo} = ${cifra(crudo)}; ` +
				(base.tipo === 'capacidad'
					? `como el egreso es igual o superior a la capacidad máxima de respuesta, el puntaje del subfactor es de ${cifra(o.maximo)} puntos, conforme al literal a del artículo 39 del Acuerdo.`
					: `como el egreso supera la carga base, el puntaje del subfactor es de ${cifra(o.maximo)} puntos, conforme al parágrafo 2.º del artículo 39 del Acuerdo.`);
	}

	return [datos, subfactor, formula, resultado];
}

function parrafosAudiencias(a: AudienciasEficiencia | null, p: Palabras): string[] {
	if (!a || a.programadas === 0)
		return [
			`Subfactor Atención de Audiencias Programadas: no se registraron audiencias programadas en el período; el puntaje del subfactor es de ${cifra(0)} puntos.`,
		];
	const sumandos = [a.atendidas, a.ajenas, ...(a.justificadas ? [a.justificadas] : [])].join(' + ');
	return [
		`Subfactor Atención de Audiencias Programadas: audiencias programadas: ${a.programadas}; efectivamente atendidas: ${a.atendidas}; ` +
			`aplazadas o no realizadas por causas ajenas ${p.al} ${p.funcionario}: ${a.ajenas}; aplazadas por causas ${p.del} ${p.funcionario} ` +
			`con justificación atendible: ${a.justificadas}; aplazadas sin justificación: ${a.noJustificadas}. Puntaje del subfactor (artículo 42):`,
		`((Audiencias efectivamente realizadas + aplazadas por causa no imputable al funcionario) / Audiencias programadas) × 5 = puntaje subfactor`,
		`((${sumandos}) / ${a.programadas}) × 5 = ${cifra(a.puntaje)}`,
	];
}

/** "se descontó un (1) día de ..." si es una sola novedad de un día; si no, "se descontaron". */
const verboDescuento = (descuentos: string) => {
	const t = descuentos.trim();
	const unaSola = !/\)(,| y) /.test(t);
	return unaSola && /^un \(1\) día\b/.test(t) ? 'se descontó' : 'se descontaron';
};

function parrafosDespacho(d: DespachoEficiencia, p: Palabras): string[] {
	const out: string[] = [];
	out.push(`${nombreDespacho(d.nombre)} del ${fechaCorta(d.desde)} al ${fechaCorta(d.hasta)}`);
	out.push(
		`Días laborables del Despacho: ${d.diasHabilesDespacho} – Días laborables ${p.del} ${p.Funcionario}: ${d.diasLaborables} - ` +
			`Días laborados por ${p.el} ${p.funcionario}: ${d.diasLaborados}.` +
			(d.descuentos?.trim()
				? ` Para calcular los días laborados por ${p.el} ${p.funcionario} ${verboDescuento(d.descuentos)} ${d.descuentos.trim().replace(/\.$/, '')}.`
				: '') +
			` Durante el período a evaluar el despacho registró, en los formularios de estadística SIERJU, el siguiente movimiento de ` +
			`procesos que sirve de base para su evaluación en el factor eficiencia o rendimiento:`
	);
	out.push(
		`Carga efectiva total del despacho: ${cantidad(d.cargaEfectivaTotal)} procesos. Egreso efectivo total del despacho: ` +
			`${cantidad(d.egresoEfectivoTotal)} procesos. Capacidad máxima de respuesta: ${d.capacidad != null ? cantidad(d.capacidad) + ' procesos' : 'sin capacidad registrada'}.`
	);

	const componentes: { nombre: string; valor: number }[] = [];
	let letra = 'A';
	const siguiente = () => {
		const l = letra;
		letra = String.fromCharCode(letra.charCodeAt(0) + 1);
		return l;
	};

	if (tieneDatos(d.oral)) {
		out.push(`${siguiente()}. Factor Eficiencia o Rendimiento – Sistema Oral`);
		out.push(
			...parrafosSubfactor(d.oral, d, p, {
				maximo: d.esGarantias ? 45 : 40,
				conCapacidad: true,
				principal: 'del sistema oral',
				conTutelas: !d.conEscritos,
			})
		);
		if (d.esGarantias)
			// Como en el cálculo: sin audiencias y sobre 45 (generarCalificacionDespacho).
			out.push(
				`En los despachos con función de control de garantías, el subfactor respuesta efectiva a la demanda de justicia se ` +
					`califica sobre 45 puntos y no se califica la atención de audiencias programadas.`
			);
		else {
			out.push(...parrafosAudiencias(d.audiencias, p));
			out.push(
				`Total de los subfactores respuesta efectiva a la demanda de justicia y atención de audiencias programadas: ` +
					`${cifra(d.oral.total)} + ${cifra(d.audiencias?.programadas ? d.audiencias.puntaje : 0)} = ${cifra(d.oralMasAudiencias)}.`
			);
		}
		// Con otro sistema después (escritural o garantías), ARGUMENTOS cierra el oral con su total propio.
		if (tieneDatos(d.escrito) || tieneDatos(d.garantias))
			out.push(`TOTAL FACTOR EFICIENCIA O RENDIMIENTO SISTEMA ORAL: ${cifra(d.oralMasAudiencias)} puntos`);
		componentes.push({ nombre: 'oral', valor: d.oralMasAudiencias });
	}
	if (tieneDatos(d.garantias)) {
		out.push(`${siguiente()}. Factor Eficiencia o Rendimiento – Control de Garantías`);
		out.push(
			...parrafosSubfactor(d.garantias, d, p, { maximo: 45, conCapacidad: false, principal: 'de control de garantías', conTutelas: false })
		);
		componentes.push({ nombre: 'control de garantías', valor: d.garantias.total });
	}
	if (tieneDatos(d.escrito)) {
		out.push(`${siguiente()}. Factor Eficiencia o Rendimiento Sistema Escritural – Tutelas`);
		out.push(
			...parrafosSubfactor(d.escrito, d, p, {
				maximo: 45,
				conCapacidad: false,
				principal: 'del sistema escrito',
				conTutelas: d.conEscritos,
			})
		);
		out.push(`Total factor eficiencia o rendimiento sistema escritural: ${cifra(d.escrito.total)}`);
		componentes.push({ nombre: 'sistema escritural', valor: d.escrito.total });
	}

	// El cálculo promedia solo los componentes con puntaje (filter(Boolean) en generarCalificacionDespacho).
	const conPuntaje = componentes.filter((c) => c.valor);
	if (conPuntaje.length > 1) {
		const suma = conPuntaje.reduce((s, c) => s + c.valor, 0);
		out.push(
			`Total factor eficiencia o rendimiento ${conPuntaje.map((c) => c.nombre).join(' / ')}: = ${conPuntaje.map((c) => cifra(c.valor)).join(' + ')} = ` +
				`${cifra(suma)} / ${conPuntaje.length} = ${cifra(d.total)}`
		);
	}
	return out;
}

/**
 * Párrafos de la motivación del factor eficiencia. Con varios despachos, un
 * bloque por despacho y la ponderación por días laborados al final.
 */
export function motivacionEficiencia(d: { genero: Genero | null; despachos: DespachoEficiencia[]; ponderada: number }): string[] {
	const p = palabras(d.genero);
	const out = [
		`La calificación de este factor se realizó de conformidad con lo establecido en los artículos 34 a 46 del Acuerdo ` +
			`PSAA16-10618 de 2016, expedido por el Consejo Superior de la Judicatura.`,
	];
	for (const despacho of d.despachos) out.push(...parrafosDespacho(despacho, p));

	if (d.despachos.length > 1) {
		const dias = d.despachos.reduce((s, x) => s + x.diasLaborados, 0);
		out.push(
			`Calificación ponderada del factor eficiencia o rendimiento, según los días laborados en cada despacho: (` +
				d.despachos.map((x) => `${cifra(x.total)} × ${x.diasLaborados}`).join(' + ') +
				`) / ${dias} = ${cifra(d.ponderada)}`
		);
	}
	out.push(`TOTAL FACTOR EFICIENCIA O RENDIMIENTO: ${cifra(d.ponderada)} puntos`);
	return out;
}
