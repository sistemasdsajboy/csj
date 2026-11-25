import type { Genero } from '@prisma/client';
import { baseDelSubfactor, verboDescuento, type DespachoEficiencia, type SubfactorEficiencia } from './motivacion-eficiencia';
import { cantidad, cifra, enLetras, fechaCorta, palabras, type Palabras } from './redaccion';

/**
 * Motivación del factor eficiencia o rendimiento con la redacción del despacho 1:
 * los formatos por especialidad de la consejera ponente (ejecución de penas,
 * control de garantías, oral, oral y escrito, promiscuo oral y promiscuo oral y
 * escrito). Las cifras salen del cálculo guardado, igual que en el despacho 2
 * (`motivacion-eficiencia.ts`); solo cambia la redacción.
 *
 * Qué subfactores aparecen lo deciden los datos, para que el texto siempre
 * explique el puntaje; la especialidad elegida decide cómo se redactan.
 * Respecto de los formatos originales: el tope de 40 o 45 se explica cuando el
 * egreso supera la carga, se muestran cuatro decimales cuando con dos la cuenta
 * no cuadra, y el área de control de garantías solo se menciona si el juzgado la tiene.
 */

export const PLANTILLAS_DESPACHO_1 = {
	ejecucionPenas: 'Ejecución de penas',
	garantias: 'Control de garantías',
	oral: 'Oral, no promiscuo (p. ej. civil municipal)',
	oralEscrito: 'Oral y escrito, no promiscuo (p. ej. familia)',
	promiscuoOral: 'Promiscuo municipal oral',
	promiscuoOralEscrito: 'Promiscuo oral y escrito',
} as const;

export type PlantillaDespacho1 = keyof typeof PLANTILLAS_DESPACHO_1;

// `Object.hasOwn` y no `in`: con `in`, "constructor" o "toString" pasarían por plantillas válidas.
export const esPlantillaDespacho1 = (x: unknown): x is PlantillaDespacho1 =>
	typeof x === 'string' && Object.hasOwn(PLANTILLAS_DESPACHO_1, x);

const tieneDatos = (s: SubfactorEficiencia | null): s is SubfactorEficiencia =>
	!!s && (s.cargaDespacho !== 0 || s.cargaFuncionario !== 0 || s.egreso !== 0 || s.total !== 0);

/** La especialidad que corresponde a los datos del juzgado; quien califica puede elegir otra. */
export function plantillaSugerida(d: DespachoEficiencia): PlantillaDespacho1 {
	if (d.especialidad === 'EjecucionPenas') return 'ejecucionPenas';
	if (d.esGarantias) return 'garantias';
	const escrito = tieneDatos(d.escrito);
	if (d.especialidad === 'Promiscuo') return escrito ? 'promiscuoOralEscrito' : 'promiscuoOral';
	return escrito ? 'oralEscrito' : 'oral';
}

export type PlantillaElegida = { despachoId: string; plantilla: string };

/** La elegida para el juzgado si es válida; si no, la que corresponde a sus datos. */
export function plantillaDe(d: DespachoEficiencia, elegidas: PlantillaElegida[] | null | undefined): PlantillaDespacho1 {
	const elegida = d.despachoId ? elegidas?.find((x) => x.despachoId === d.despachoId)?.plantilla : undefined;
	return esPlantillaDespacho1(elegida) ? elegida : plantillaSugerida(d);
}

const lista = (partes: string[]) =>
	partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
const redondo = (n: number, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;
/**
 * Como se redondea a mano: de 5 en adelante se sube. `toFixed` no siempre lo hace
 * (36,145 queda en 36,14 porque internamente es 36,1449999...), y quien rehace la
 * cuenta con las cifras del texto llega a 36,15.
 */
const aMano = (x: number, dec = 2) => cifra(Math.floor(x * 10 ** dec + 0.5 + 1e-6) / 10 ** dec, dec);

/**
 * Sumandos, suma y resultado de un promedio. Con los sumandos redondeados a dos
 * decimales, rehacer la cuenta a mano puede dar una centésima distinta del
 * resultado (que se calcula con las cifras completas); en ese caso se muestran
 * con cuatro. La suma es siempre la de los sumandos tal como se muestran.
 */
function promedioMostrado(valores: number[], resultado: number) {
	const con = (dec: number) => {
		const partes = valores.map((v) => redondo(v, dec));
		const suma = partes.reduce((a, b) => a + b, 0);
		return { partes: partes.map((v) => cifra(v, dec)), suma: cifra(suma, dec), cuadra: aMano(suma / valores.length) === cifra(resultado) };
	};
	const dos = con(2);
	const m = dos.cuadra ? dos : con(4);
	return { partes: m.partes, suma: m.suma, resultado: cifra(resultado) };
}

/**
 * "Carga proporcional al tiempo laborado por la funcionaria: 156,31 – (carga total del despacho / ...)".
 * Se calcula con la carga que el texto llama "Carga total del despacho" (la carga base del
 * despacho en el sistema); los formatos originales decían "carga base de calificación" en casi
 * todos los párrafos y con esa cifra la cuenta no da.
 */
const cargaProporcional = (s: SubfactorEficiencia, p: Palabras) =>
	`Carga proporcional al tiempo laborado por ${p.el} ${p.funcionario}: ${cantidad(s.cargaProporcional)} – (carga total del despacho / días ` +
	`laborables del despacho x días laborados por ${p.el} ${p.funcionario}).`;

/**
 * La línea del puntaje: "<prefijo>: egreso base calificación: 100 / Carga proporcional: 156,31 X 40 = 25,59."
 * Con la base con que calificó el sistema (`baseDelSubfactor`), y el tope explicado.
 */
function lineaPuntaje(s: SubfactorEficiencia, d: DespachoEficiencia, p: Palabras, prefijo: string, maximo: 40 | 45, conCapacidad: boolean) {
	const base = baseDelSubfactor(s, d, conCapacidad);
	if (base.valor <= 0) return `${prefijo}: como la carga base para la calificación es de cero, el puntaje del subfactor es de ${cifra(0)}.`;
	const etiqueta =
		base.tipo === 'capacidad'
			? 'Capacidad máxima proporcional'
			: base.tipo === 'funcionario'
				? `Carga ${p.del} ${p.funcionario}`
				: 'Carga proporcional';
	// Lo que da la cuenta rehecha a mano con la base tal como se muestra (dos decimales).
	const aManoConDos = aMano((s.egreso / redondo(base.valor)) * maximo);
	const crudo = (s.egreso / base.valor) * maximo;
	// Con tope el puntaje es el máximo: la cuenta se muestra con la base en dos decimales, tal como se rehace a mano.
	const conTope = crudo > maximo + 1e-9;
	const valor = conTope || Number.isInteger(base.valor) || aManoConDos === cifra(crudo) ? cantidad(base.valor) : cifra(base.valor, 4);
	const cuenta = `${prefijo}: egreso base calificación: ${cantidad(s.egreso)} / ${etiqueta}: ${valor} X ${maximo}`;
	if (conTope)
		return (
			`${cuenta} = ${aManoConDos}; como el egreso supera la ${base.tipo === 'capacidad' ? 'capacidad máxima de respuesta' : 'carga base'}, ` +
			`el puntaje es de ${cifra(maximo)}, conforme al ${base.tipo === 'capacidad' ? 'literal a' : 'parágrafo 2.º'} del artículo 39 del Acuerdo PSAA16-10618.`
		);
	if (base.tipo === 'capacidad')
		return (
			`${cuenta} = ${cifra(crudo)}; como la carga supera la capacidad máxima de respuesta, se califica sobre la capacidad máxima ` +
			`proporcional al tiempo laborado, conforme al literal b del artículo 39 del Acuerdo PSAA16-10618.`
		);
	return `${cuenta} = ${cifra(crudo)}.`;
}

function parrafosAudiencias(d: DespachoEficiencia, p: Palabras): string[] {
	const a = d.audiencias;
	const puntaje = a?.programadas ? a.puntaje : 0;
	const out: string[] = [];
	if (!a || a.programadas === 0)
		out.push(
			`-Subfactor Atención de Audiencias Programadas: no se registraron audiencias programadas en el período; el puntaje del subfactor es de ${cifra(0)}.`
		);
	else
		out.push(
			`-Subfactor Atención de Audiencias Programadas: Audiencias programadas: ${a.programadas} - Audiencias efectivamente atendidas: ` +
				`${a.atendidas} - audiencias aplazadas por causas ajenas ${p.al} ${p.funcionario}: ${a.ajenas} - audiencias aplazadas por causa ` +
				`${p.del} ${p.funcionario} con justificación: ${a.justificadas}.`,
			`PUNTAJE DEL SUBFACTOR: Audiencias efectivamente realizadas + aplazadas por causa no imputable ${p.al} ${p.funcionario} + aplazadas ` +
				`por ${p.el} ${p.funcionario} con justificación / audiencias programadas X 5 = (${a.atendidas} + ${a.ajenas} + ${a.justificadas}) / ` +
				`${a.programadas} X 5 = ${cifra(puntaje)}.`
		);
	out.push(
		`Total subfactores RESPUESTA EFECTIVA A LA DEMANDA DE JUSTICIA Y ATENCIÓN DE AUDIENCIAS PROGRAMADAS: ${cifra(d.oralMasAudiencias)}.`
	);
	return out;
}

type Componente = { area: string; valor: number };

/** Ejecución de penas: actuaciones y tutelas, sin títulos por sistema. */
function bloquesEjecucion(d: DespachoEficiencia, p: Palabras): { parrafos: string[]; componentes: Componente[] } {
	const parrafos: string[] = [];
	const componentes: Componente[] = [];
	const uno = (s: SubfactorEficiencia, maximo: 40 | 45, conCapacidad: boolean) => {
		parrafos.push(
			`- Subfactor Respuesta Efectiva a la demanda de justicia: Carga total del despacho: ${cantidad(s.cargaDespacho)} actuaciones y tutelas - ` +
				`Carga base para calificación ${p.del} ${p.funcionario}: ${cantidad(s.cargaFuncionario)} actuaciones y tutelas – sin contar las ` +
				`acciones de tutela y los incidentes de desacato, que al finalizar el período estén dentro de los términos para ser fallados; ` +
				`Egreso base para calificación: ${cantidad(s.egreso)} actuaciones y acciones de tutela. ${cargaProporcional(s, p)}`,
			lineaPuntaje(s, d, p, 'Respuesta efectiva demanda de justicia', maximo, conCapacidad)
		);
	};
	if (tieneDatos(d.oral)) {
		uno(d.oral, d.esGarantias ? 45 : 40, true);
		if (!d.esGarantias) parrafos.push(...parrafosAudiencias(d, p));
		componentes.push({ area: 'respuesta efectiva a la demanda de justicia', valor: d.oralMasAudiencias });
	}
	if (tieneDatos(d.escrito)) {
		uno(d.escrito, 45, false);
		componentes.push({ area: 'respuesta efectiva a la demanda de justicia', valor: d.escrito.total });
	}
	if (tieneDatos(d.garantias)) {
		uno(d.garantias, 45, false);
		componentes.push({ area: 'control de garantías', valor: d.garantias.total });
	}
	return { parrafos, componentes };
}

/** Control de garantías: las audiencias de garantías y las tutelas, cada una sobre 45. */
function bloquesGarantias(d: DespachoEficiencia, p: Palabras): { parrafos: string[]; componentes: Componente[] } {
	const parrafos: string[] = [];
	const componentes: Componente[] = [];
	if (tieneDatos(d.garantias)) {
		const s = d.garantias;
		parrafos.push(
			`- Factor eficiencia o rendimiento para control de garantías: Carga total del despacho: ${cantidad(s.cargaDespacho)} audiencias - ` +
				`Carga base para calificación ${p.del} ${p.funcionario}: ${cantidad(s.cargaFuncionario)} audiencias; Egreso base para calificación: ` +
				`${cantidad(s.egreso)} audiencias. ${cargaProporcional(s, p)}`,
			lineaPuntaje(s, d, p, 'Factor eficiencia o rendimiento para control de garantías', 45, false)
		);
		componentes.push({ area: 'Factor eficiencia o rendimiento para control de garantías', valor: s.total });
	}
	if (tieneDatos(d.oral)) {
		const s = d.oral;
		parrafos.push(
			`- Factor eficiencia o rendimiento tutelas e incidentes de desacato y acciones constitucionales: Carga total del despacho: ` +
				`${cantidad(s.cargaDespacho)} - Carga base para calificación ${p.del} ${p.funcionario}: ${cantidad(s.cargaFuncionario)} - sin contar ` +
				`las acciones de tutela y los incidentes de desacato que al finalizar el período estaban dentro de los términos para ser fallados; ` +
				`Egreso base para calificación: ${cantidad(s.egreso)} acciones e incidentes. ${cargaProporcional(s, p)}`,
			lineaPuntaje(
				s,
				d,
				p,
				'Factor eficiencia o rendimiento para tutelas, incidentes de desacato y acciones constitucionales',
				d.esGarantias ? 45 : 40,
				true
			)
		);
		if (!d.esGarantias) parrafos.push(...parrafosAudiencias(d, p));
		componentes.push({ area: 'Factor eficiencia o rendimiento para tutelas e incidentes de desacato', valor: d.oralMasAudiencias });
	}
	if (tieneDatos(d.escrito)) {
		const s = d.escrito;
		parrafos.push(
			`- Factor eficiencia o rendimiento sistema escritural: Carga total del despacho: ${cantidad(s.cargaDespacho)} procesos - Carga base ` +
				`para calificación ${p.del} ${p.funcionario}: ${cantidad(s.cargaFuncionario)} procesos; Egreso base para calificación: ` +
				`${cantidad(s.egreso)} procesos. ${cargaProporcional(s, p)}`,
			lineaPuntaje(s, d, p, 'Factor eficiencia o rendimiento sistema escritural', 45, false)
		);
		componentes.push({ area: 'Factor eficiencia o rendimiento sistema escritural', valor: s.total });
	}
	return { parrafos, componentes };
}

/** Oral, oral y escrito, promiscuo oral y promiscuo oral y escrito. */
function bloquesOrales(d: DespachoEficiencia, p: Palabras, t: PlantillaDespacho1): { parrafos: string[]; componentes: Componente[] } {
	const parrafos: string[] = [];
	const componentes: Componente[] = [];
	const conEscrito = tieneDatos(d.escrito);
	const conGarantias = tieneDatos(d.garantias);
	const varios = [tieneDatos(d.oral), conEscrito, conGarantias].filter(Boolean).length > 1;
	const promiscuoOral = t === 'promiscuoOral';

	if (tieneDatos(d.oral)) {
		const s = d.oral;
		const excluye = conEscrito
			? `sin contar las demandas ingresadas durante el último trimestre, ni los del área escritural, las acciones de tutela${
					conGarantias ? ', los incidentes de desacato y el área de control de garantías' : ' y los incidentes de desacato'
				}, que se califican aparte conforme a lo establecido en los artículos 62 y 104 del Acuerdo PSAA16-10618`
			: `sin contar las demandas ingresadas durante el último trimestre, ni las acciones de tutela y los incidentes de desacato, que al ` +
				`finalizar el período estén dentro de los términos para ser fallados${
					conGarantias
						? ' y el área de control de garantías que se califica aparte conforme a lo establecido en el artículo 62 del Acuerdo PSAA16-10618'
						: ''
				}`;
		const datos =
			`Carga total del despacho: ${cantidad(s.cargaDespacho)} procesos - Carga base para calificación ${p.del} ${p.funcionario}: ` +
			`${cantidad(s.cargaFuncionario)} procesos – ${excluye}; Egreso base para calificación: ${cantidad(s.egreso)} procesos − contabilizado ` +
			`doble el egreso por conciliación−. ${cargaProporcional(s, p)}`;
		if (promiscuoOral) parrafos.push('SUBFACTOR RESPUESTA EFECTIVA A LA DEMANDA DE JUSTICIA:', datos);
		else {
			if (varios) parrafos.push('FACTOR EFICIENCIA O RENDIMIENTO SISTEMA ORAL');
			parrafos.push(`- Subfactor Respuesta Efectiva a la demanda de justicia: ${datos}`);
		}
		parrafos.push(lineaPuntaje(s, d, p, 'Respuesta efectiva demanda de justicia', d.esGarantias ? 45 : 40, true));
		if (!d.esGarantias) parrafos.push(...parrafosAudiencias(d, p));
		componentes.push({
			area: d.esGarantias
				? 'Respuesta efectiva a la demanda de Justicia'
				: `Respuesta efectiva a la demanda de Justicia con la atención de audiencias programadas${conEscrito ? ' sistema oral' : ''}`,
			valor: d.oralMasAudiencias,
		});
	}

	if (conEscrito) {
		const s = d.escrito!;
		if (varios) parrafos.push('FACTOR EFICIENCIA O RENDIMIENTO SISTEMA ESCRITURAL – TUTELAS');
		parrafos.push(
			`- Subfactor Respuesta Efectiva a la demanda de justicia: Carga total del despacho: ${cantidad(s.cargaDespacho)} procesos - Carga ` +
				`base para calificación ${p.del} ${p.funcionario}: ${cantidad(s.cargaFuncionario)} procesos – sin contar las demandas ingresadas ` +
				`durante el último trimestre, las acciones de tutela y los incidentes de desacato que al finalizar el período estén dentro de los ` +
				`términos para ser fallados${
					conGarantias
						? ' y el área de control de garantías que se califica aparte conforme a lo establecido en el artículo 62 del Acuerdo PSAA16-10618'
						: ''
				}; Egreso base para calificación: ${cantidad(s.egreso)} procesos − contabilizado doble el egreso por conciliación−. ${cargaProporcional(s, p)}`,
			lineaPuntaje(s, d, p, 'Respuesta efectiva demanda de justicia', 45, false)
		);
		if (varios) parrafos.push(`TOTAL FACTOR EFICIENCIA O RENDIMIENTO SISTEMA ESCRITURAL: ${cifra(s.total)}.`);
		componentes.push({ area: 'Respuesta efectiva a la demanda de Justicia sistema escritural', valor: s.total });
	}

	if (conGarantias) {
		const s = d.garantias!;
		if (promiscuoOral) parrafos.push('SUBFACTOR CONTROL DE GARANTÍAS:');
		else if (varios) parrafos.push('FACTOR EFICIENCIA O RENDIMIENTO CONTROL DE GARANTÍAS');
		parrafos.push(
			`${promiscuoOral ? '' : '- Subfactor Control de Garantías: '}Carga control de garantías despacho: ${cantidad(s.cargaDespacho)} – Carga ` +
				`control de garantías ${p.funcionario}: ${cantidad(s.cargaFuncionario)} - Inventario inicial más las solicitudes de audiencias ` +
				`ingresadas durante el período; egreso control de garantías: ${cantidad(s.egreso)} audiencias atendidas. ${cargaProporcional(s, p)}`,
			lineaPuntaje(s, d, p, 'Calificación del área de competencia de control de garantías', 45, false)
		);
		componentes.push({ area: 'el área de control de garantías', valor: s.total });
	}
	return { parrafos, componentes };
}

/** Promedio de las áreas, con el artículo 62 (o la suma propia del formato de garantías). */
function parrafosPromedio(d: DespachoEficiencia, t: PlantillaDespacho1, componentes: Componente[]): string[] {
	// Como el cálculo: solo promedian las áreas con puntaje (filter(Boolean) en generarCalificacionDespacho).
	const con = componentes.filter((c) => c.valor);
	if (con.length < 2) return [];
	const m = promedioMostrado(
		con.map((c) => c.valor),
		d.total
	);
	if (t === 'garantias')
		return [
			`Total factor eficiencia o rendimiento: ${con.map((c, n) => `${c.area}: ${m.partes[n]}`).join(' + ')} = ${m.suma}. Promedio: ${m.resultado}.`,
		];
	const promiscuo = t === 'promiscuoOral' || t === 'promiscuoOralEscrito';
	const juzgados = promiscuo ? `Juzgados Promiscuos ${d.categoria === 'Circuito' ? 'del Circuito' : 'Municipales'}` : 'Juzgados';
	const titulo =
		t === 'promiscuoOral' ? ['PONDERACIÓN'] : t === 'promiscuoOralEscrito' ? ['PUNTAJE CONSOLIDADO FACTOR EFICIENCIA O RENDIMIENTO'] : [];
	return [
		...titulo,
		`Conforme con lo establecido en el artículo 62 del Acuerdo PSAA16-10618, para la evaluación integral de los ${juzgados}, se toma la ` +
			`ponderación de los indicadores que para cada uno de los procedimientos de su competencia allí se establecen, lo cual, en este caso ` +
			`corresponde al promedio de las ${enLetras(con.length)} áreas ${lista(con.map((c) => c.area))}: ${m.partes.join(' + ')}; suman: ` +
			`${m.suma}; promedio: ${m.resultado}.`,
	];
}

function parrafosDespacho(d: DespachoEficiencia, p: Palabras, t: PlantillaDespacho1): string[] {
	const out: string[] = [`${d.nombre}: Período ${fechaCorta(d.desde)} - ${fechaCorta(d.hasta)}`];
	const descuento = d.descuentos?.trim()
		? ` Para calcular los días laborados ${p.del} ${p.funcionario} ${verboDescuento(d.descuentos)} ${d.descuentos.trim().replace(/\.$/, '')}.`
		: '';
	// La capacidad máxima solo se aplica en el subfactor oral (como en el cálculo).
	const baseOral = tieneDatos(d.oral) ? baseDelSubfactor(d.oral, d, true) : null;
	const capacidad =
		t === 'garantias'
			? ''
			: ` Capacidad máxima de respuesta: ${d.capacidad != null ? cantidad(d.capacidad) : 'NA'} - Capacidad Máxima proporcional: ${
					baseOral?.tipo === 'capacidad' ? cifra(baseOral.capacidadProporcional!) : 'NA'
				}.`;
	out.push(
		`Días laborables del Despacho: ${d.diasHabilesDespacho} – Días laborables ${p.del} ${p.funcionario}: ${d.diasLaborables} – Días ` +
			`laborados por ${p.el} ${p.funcionario}: ${d.diasLaborados}.${descuento} La calificación del factor eficiencia o rendimiento se ` +
			`realizó con la información reportada por ${p.el} ${p.funcionario} en los formularios de estadística SIERJU, atendiendo las ` +
			`variables señaladas en el Acuerdo PSAA16-10618 para establecer la carga y egreso base para la determinación del puntaje.${capacidad}`
	);
	const { parrafos, componentes } =
		t === 'ejecucionPenas' ? bloquesEjecucion(d, p) : t === 'garantias' ? bloquesGarantias(d, p) : bloquesOrales(d, p, t);
	out.push(...parrafos, ...parrafosPromedio(d, t, componentes));
	return out;
}

/**
 * Párrafos de la motivación del factor eficiencia del despacho 1. Con varios
 * juzgados, un bloque por juzgado y la ponderación por días laborados; los
 * juzgados sin días laborados no aparecen (no pesan en la ponderación).
 */
export function motivacionEficienciaDespacho1(d: {
	genero: Genero | null;
	despachos: DespachoEficiencia[];
	ponderada: number;
	elegidas?: PlantillaElegida[] | null;
}): string[] {
	const p = palabras(d.genero);
	const out = [
		'La calificación de este factor se realizó de conformidad con lo establecido en el Acuerdo PSAA16-10618 proferido por el Consejo Superior de la Judicatura.',
	];
	const conDias = d.despachos.filter((x) => x.diasLaborados > 0);
	const despachos = conDias.length ? conDias : d.despachos;
	const varios = despachos.length > 1;
	for (const despacho of despachos) {
		out.push(...parrafosDespacho(despacho, p, plantillaDe(despacho, d.elegidas)));
		if (varios) out.push(`TOTAL FACTOR EFICIENCIA O RENDIMIENTO ${despacho.nombre}: ${cifra(despacho.total)}.`);
	}
	if (varios) {
		const dias = despachos.reduce((s, x) => s + x.diasLaborados, 0);
		const cuadra = aMano(despachos.reduce((s, x) => s + redondo(x.total) * x.diasLaborados, 0) / dias) === cifra(d.ponderada);
		out.push(
			'PONDERACIÓN POR DÍAS LABORADOS',
			`Como ${p.el} ${p.funcionario} laboró en ${enLetras(despachos.length)} despachos durante el período, el factor eficiencia o ` +
				`rendimiento corresponde al promedio ponderado por los días laborados en cada uno: (` +
				despachos.map((x) => `${cifra(x.total, cuadra ? 2 : 4)} × ${x.diasLaborados}`).join(' + ') +
				`) / ${dias} = ${cifra(d.ponderada)}.`
		);
	}
	out.push(`TOTAL FACTOR EFICIENCIA O RENDIMIENTO: ${cifra(d.ponderada)}.`);
	return out;
}
