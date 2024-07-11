import { db } from '$lib/db/client';
import {
	contarDiasHabiles,
	diaJusticia,
	festivosPorMes,
	semanaSantaCompleta,
	unirFechasNoHabiles,
	vacanciaJudicial
} from '$lib/utils/dates';
import type { ClaseRegistroCalificacion, RegistroCalificacion, TipoDespacho } from '@prisma/client';
import dayjs from 'dayjs';
import _ from 'lodash';

const getInventarioInicial = (data: RegistroCalificacion[]) => {
	const minDate = _.minBy(data, 'desde')?.desde;
	return _.sumBy(data, (d) => (dayjs(d.desde).isSame(minDate) ? d.inventarioInicial : 0));
};

const getIngresoEfectivo = (data: RegistroCalificacion[]) => {
	return _.sumBy(data, (d) => d.ingresoEfectivo);
};

const getIngresoEfectivoUltimoPeriodo = (data: RegistroCalificacion[]) => {
	return _.sumBy(data, (d) => (dayjs(d.desde).month() >= 9 ? d.ingresoEfectivo : 0));
};

const getInventarioFinal = (data: RegistroCalificacion[], funcionarioId: string) => {
	const maxDesde = _.maxBy(data, 'desde')?.desde;
	return _(data)
		.filter((d) => d.funcionarioId === funcionarioId && dayjs(d.desde).isSame(maxDesde))
		.sumBy((d) => d.inventarioFinal);
};

const getEgresoTotal = (data: RegistroCalificacion[]) => _.sumBy(data, 'egresoEfectivo');

const getEgresoFuncionario = (data: RegistroCalificacion[], funcionarioId: string) => {
	return _.sumBy(data, (d) =>
		d.funcionarioId === funcionarioId ? d.egresoEfectivo + d.conciliaciones : 0
	);
};

const getEgresoOtrosFuncionarios = (data: RegistroCalificacion[], funcionarioId: string) => {
	return _.sumBy(data, (d) => (d.funcionarioId !== funcionarioId ? d.egresoEfectivo : 0));
};

const getCargaBaseCalificacionDespacho = (data: RegistroCalificacion[]) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const ingresoEfectivo = getIngresoEfectivo(data);
	return totalInventarioInicial + ingresoEfectivo;
};

const generarResultadosSubfactor = (
	funcionarioId: string,
	diasHabilesDespacho: number,
	diasHabilesFuncionario: number,
	data: RegistroCalificacion[],
	dataTutelas: RegistroCalificacion[],
	maxResultado: number,
	hayEscritos: boolean,
	clase: ClaseRegistroCalificacion
) => {
	if (!data.length)
		return {
			subfactor: clase,
			totalInventarioInicial: 0,
			cargaBaseCalificacionDespacho: 0,
			cargaBaseCalificacionFuncionario: 0,
			egresoFuncionario: 0,
			cargaProporcional: 0,
			totalSubfactor: 0
		};

	const subfactor = data[0].clase;
	let totalInventarioInicial = getInventarioInicial(data);
	let egresoFuncionario = getEgresoFuncionario(data, funcionarioId);
	let egresoOtrosFuncionarios = getEgresoOtrosFuncionarios(data, funcionarioId);
	let cargaBaseCalificacionDespacho = getCargaBaseCalificacionDespacho(data);

	if (subfactor === 'oral' || subfactor === 'escrito') {
		cargaBaseCalificacionDespacho =
			cargaBaseCalificacionDespacho - getIngresoEfectivoUltimoPeriodo(data);
		if ((!hayEscritos && subfactor === 'oral') || (hayEscritos && subfactor === 'escrito')) {
			totalInventarioInicial = totalInventarioInicial + getInventarioInicial(dataTutelas);
			egresoFuncionario = egresoFuncionario + getEgresoFuncionario(dataTutelas, funcionarioId);
			egresoOtrosFuncionarios =
				egresoOtrosFuncionarios + getEgresoOtrosFuncionarios(dataTutelas, funcionarioId);
			cargaBaseCalificacionDespacho =
				cargaBaseCalificacionDespacho +
				getCargaBaseCalificacionDespacho(dataTutelas) -
				getInventarioFinal(dataTutelas, funcionarioId);
		}
	}
	let cargaBaseCalificacionFuncionario = cargaBaseCalificacionDespacho - egresoOtrosFuncionarios;

	const cargaProporcional =
		(cargaBaseCalificacionDespacho * diasHabilesFuncionario) / diasHabilesDespacho;
	const totalSubfactor = cargaProporcional
		? Math.min(
				(Math.min(egresoFuncionario, cargaBaseCalificacionFuncionario) / cargaProporcional) *
					maxResultado,
				maxResultado
			)
		: 0;

	return {
		subfactor,
		totalInventarioInicial,
		cargaBaseCalificacionDespacho,
		cargaBaseCalificacionFuncionario,
		egresoFuncionario,
		cargaProporcional,
		totalSubfactor
	};
};

function generarConsolidado({
	diasNoHabiles,
	registros
}: {
	diasNoHabiles: Record<string, Array<number>>;
	registros: RegistroCalificacion[];
}) {
	const agrupadoPorCategoria = _(registros)
		.groupBy('desde')
		.map((d) => ({
			periodo: d[0].periodo,
			despachoId: d[0].despachoId,
			funcionarioId: d[0].funcionarioId,
			clase: d[0].clase,
			categoria: 'Consolidado',
			desde: d[0].desde,
			hasta: d[0].hasta,
			dias: contarDiasHabiles(diasNoHabiles, d[0].desde, d[0].hasta),
			inventarioInicial: _.sumBy(d, 'inventarioInicial'),
			ingresoEfectivo: _.sumBy(d, 'ingresoEfectivo'),
			cargaEfectiva: _.sumBy(d, 'cargaEfectiva'),
			egresoEfectivo: _.sumBy(d, 'egresoEfectivo'),
			conciliaciones: _.sumBy(d, 'conciliaciones'),
			inventarioFinal: _.sumBy(d, 'inventarioFinal'),
			restan: _.sumBy(d, 'restan')
		}))
		.sortBy('desde')
		.value();

	return agrupadoPorCategoria;
}

export function getDiasFestivosPorTipoDespacho(tipoDespacho: TipoDespacho | null) {
	if (tipoDespacho === null) return festivosPorMes;

	const { especialidad, categoria } = tipoDespacho;

	if (especialidad === 'EjecucionPenas' || especialidad === 'FamiliaPromiscuo')
		return unirFechasNoHabiles(festivosPorMes, diaJusticia);

	if (
		categoria === 'Municipal' &&
		(especialidad === 'PenalAdolescentes' ||
			especialidad === 'PenalGarantias' ||
			especialidad === 'PenalConocimiento' ||
			especialidad === 'PenalMixto')
	)
		return unirFechasNoHabiles(festivosPorMes, diaJusticia, semanaSantaCompleta);

	return unirFechasNoHabiles(festivosPorMes, diaJusticia, semanaSantaCompleta, vacanciaJudicial);
}

async function calcularPonderada(
	calificaciones: { diasLaborados: number; calificacionTotalFactorEficiencia: number }[]
) {
	if (calificaciones.length === 0) return 0;
	if (calificaciones.length === 1) return calificaciones[0].calificacionTotalFactorEficiencia;

	const totalDiasLaborados = _.sumBy(calificaciones, 'diasLaborados');
	return _(calificaciones)
		.map(
			({ diasLaborados, calificacionTotalFactorEficiencia }) =>
				(calificacionTotalFactorEficiencia / totalDiasLaborados) * diasLaborados
		)
		.sum();
}

async function generarCalificacionPonderada(calificacionId: string) {
	const calificacion = await db.calificacionPeriodo.findFirst({
		where: { id: calificacionId },
		include: { calificaciones: true }
	});
	if (!calificacion) throw new Error('Calificación no encontrada');

	const calificacionPonderada = await calcularPonderada(calificacion.calificaciones ?? []);
	await db.calificacionPeriodo.update({
		where: { id: calificacionId },
		data: { calificacionPonderada }
	});
}

async function findOrCreateCalificacionPeriodo(funcionarioId: string, periodo: number) {
	const calificacionPeriodo = await db.calificacionPeriodo.findFirst({
		where: { funcionarioId, periodo }
	});
	if (calificacionPeriodo) return calificacionPeriodo;
	return db.calificacionPeriodo.create({ data: { estado: 'borrador', funcionarioId, periodo } });
}

async function getCuentaProcesosEscritos(despachoId: string, periodo: number) {
	return db.registroCalificacion.count({
		where: {
			despachoId,
			periodo,
			clase: 'escrito',
			categoria: { not: 'Consolidado' },
			cargaEfectiva: { gt: 0 }
		}
	});
}

async function actualizarClaseRegistros(despachoId: string, periodo: number) {
	const cuentaProcesosEscritos = await getCuentaProcesosEscritos(despachoId, periodo);

	if (cuentaProcesosEscritos > 0) {
		// Cuando hay procesos escritos, estas categorías se acumulan con ellos.
		const categoriasConstitucional = ['Primera Instancia Acciones Constitucionales'];
		await db.registroCalificacion.updateMany({
			where: { despachoId, periodo, categoria: { in: categoriasConstitucional } },
			data: { clase: 'escrito' }
		});
	}

	// Categorías incluidas en la clase oral que deben consolidarse bajo la clase "tutelas".
	const categoriasTutelas = [
		'Incidentes de Desacato',
		'Movimiento de Tutelas',
		'Procesos con sentencia y trámite posterior incidentes de Desacato'
	];
	await db.registroCalificacion.updateMany({
		where: { despachoId, periodo, categoria: { in: categoriasTutelas } },
		data: { clase: 'tutelas' }
	});
}

export async function generarCalificacionFuncionario(
	funcionarioId: string,
	despachoId: string,
	periodo: number
): Promise<string> {
	const calificacionPeriodo = await findOrCreateCalificacionPeriodo(funcionarioId, periodo);
	if (calificacionPeriodo.estado === 'aprobada') return calificacionPeriodo.id;

	const funcionario = await db.funcionario.findFirst({
		where: { id: funcionarioId },
		include: {
			// Consultar solo las novedades para el despacho y periodo para el que se genera la calificación
			novedades: {
				where: {
					despachoId,
					OR: [
						{ from: { lte: new Date(periodo, 11, 31) } },
						{ to: { gte: new Date(periodo, 0, 1) } }
					]
				}
			}
		}
	});
	if (!funcionario) throw new Error('Funcionario no encontrado');

	const despacho = await db.despacho.findFirst({
		where: { id: despachoId },
		include: { tipoDespacho: true }
	});
	if (!despacho) throw new Error('Despacho no encontrado');
	if (!despacho.tipoDespacho)
		throw new Error(
			`Se debe especificar el tipo de despacho para el ${despacho.nombre} antes de poder generar la calificación.`
		);

	let audiencias = await db.registroAudiencias.findFirst({
		where: { periodo, funcionarioId, despachoId }
	});
	if (!audiencias)
		audiencias = await db.registroAudiencias.create({
			data: {
				periodo,
				funcionarioId: funcionario.id,
				despachoId: despacho.id,
				programadas: 0,
				atendidas: 0,
				aplazadasAjenas: 0,
				aplazadasJustificadas: 0,
				aplazadasNoJustificadas: 0
			}
		});

	await actualizarClaseRegistros(despachoId, periodo);

	const diasNoHabiles = getDiasFestivosPorTipoDespacho(despacho.tipoDespacho);
	const diasHabilesDespacho = contarDiasHabiles(
		diasNoHabiles,
		new Date(periodo, 0, 1),
		new Date(periodo, 11, 31)
	);

	const registros = await db.registroCalificacion.findMany({
		where: { despachoId, periodo, categoria: { not: 'Consolidado' } }
	});

	const registrosTutelas = registros.filter((registro) => registro.clase === 'tutelas');
	const consolidadoTutelas = generarConsolidado({ diasNoHabiles, registros: registrosTutelas });

	const diasHabilesVinculacion = consolidadoTutelas
		.filter((registro) => registro.funcionarioId === funcionario.id)
		.map((registro) => registro.dias)
		.reduce((a, b) => a + b, 0);

	const diasDescontados = funcionario.novedades
		? funcionario.novedades.reduce((dias, novedad) => dias + novedad.days, 0)
		: 0;

	// Dias de las novedades que se encuentran dentro de los rangos de tiempo efectivamente laborado.
	const diasDescontables = funcionario.novedades
		? funcionario.novedades.reduce((dias, novedad) => {
				return dias + novedad.diasDescontables;
			}, 0)
		: 0;

	const diasHabilesLaborados = diasHabilesVinculacion - diasDescontables;

	const cuentaProcesosEscritos = await getCuentaProcesosEscritos(despachoId, periodo);

	const registrosOral = registros.filter((registro) => registro.clase === 'oral');
	const consolidadoOral = generarConsolidado({ diasNoHabiles, registros: registrosOral });
	const oral = generarResultadosSubfactor(
		funcionario.id,
		diasHabilesDespacho,
		diasHabilesLaborados,
		registrosOral,
		cuentaProcesosEscritos > 0 ? [] : registrosTutelas,
		40,
		cuentaProcesosEscritos > 0,
		'oral'
	);

	const registrosGarantias = registros.filter((registro) => registro.clase === 'garantias');
	const consolidadoGarantias = generarConsolidado({ diasNoHabiles, registros: registrosGarantias });
	const garantias = generarResultadosSubfactor(
		funcionario.id,
		diasHabilesDespacho,
		diasHabilesLaborados,
		registrosGarantias,
		[],
		45,
		cuentaProcesosEscritos > 0,
		'garantias'
	);

	const registrosEscrito = registros.filter((registro) => registro.clase === 'escrito');
	const consolidadoEscrito = generarConsolidado({ diasNoHabiles, registros: registrosEscrito });
	const escrito = generarResultadosSubfactor(
		funcionario.id,
		diasHabilesDespacho,
		diasHabilesLaborados,
		registrosEscrito,
		cuentaProcesosEscritos > 0 ? registrosTutelas : [],
		45,
		cuentaProcesosEscritos > 0,
		'escrito'
	);

	const calificacionAudiencias =
		audiencias.programadas === 0
			? 0
			: ((audiencias.atendidas + audiencias.aplazadasAjenas + audiencias.aplazadasJustificadas) /
					audiencias.programadas) *
				5;

	const factorOralMasAudiencias = oral.totalSubfactor + calificacionAudiencias;

	const baseTutelas = getCargaBaseCalificacionDespacho(registrosTutelas);
	const baseOral = getCargaBaseCalificacionDespacho(registrosOral);
	const baseGarantias = getCargaBaseCalificacionDespacho(registrosGarantias);
	const baseEscrito = getCargaBaseCalificacionDespacho(registrosEscrito);
	const egresoTutelas = getEgresoTotal(registrosTutelas);
	const egresoOral = getEgresoTotal(registrosOral);
	const egresoGarantias = getEgresoTotal(registrosGarantias);
	const egresoEscrito = getEgresoTotal(registrosEscrito);

	const totalesParaPromedio = [
		factorOralMasAudiencias,
		garantias.totalSubfactor,
		escrito.totalSubfactor
	].filter(Boolean);
	const calificacionTotalFactorEficiencia =
		totalesParaPromedio.reduce((sum, val) => sum + val, 0) / totalesParaPromedio.length;

	const consolidados = [
		...consolidadoOral,
		...consolidadoTutelas,
		...consolidadoGarantias,
		...consolidadoEscrito
	];

	const data = {
		calificacionId: calificacionPeriodo.id,
		despachoId: despacho.id,
		cargaEfectivaTotal: baseTutelas + baseOral + baseGarantias + baseEscrito,
		egresoEfectivoTotal: egresoTutelas + egresoOral + egresoGarantias + egresoEscrito,
		diasHabilesDespacho,
		diasDescontados,
		diasLaborados: diasHabilesLaborados,
		registrosConsolidados: { createMany: { data: consolidados } },
		subfactores: { createMany: { data: [oral, garantias, escrito] } },
		registroAudienciasId: audiencias.id,
		calificacionAudiencias,
		factorOralMasAudiencias,
		calificacionTotalFactorEficiencia
	};

	const calificacion = await db.calificacionDespacho.findFirst({
		where: { calificacionId: calificacionPeriodo.id, despachoId: despacho.id }
	});

	if (calificacion) {
		await db.registroCalificacion.deleteMany({
			where: { calificacionId: calificacion.id, categoria: 'Consolidado' }
		});
		await db.calificacionSubfactor.deleteMany({
			where: { calificacionId: calificacion.id }
		});
		await db.calificacionDespacho.update({ where: { id: calificacion.id }, data });
	} else {
		await db.calificacionDespacho.create({ data });
	}

	await generarCalificacionPonderada(calificacionPeriodo.id);

	return calificacionPeriodo.id;
}
