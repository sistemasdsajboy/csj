import { db } from '$lib/server/db-client';
import {
	contarDiasHabiles,
	diaJusticia,
	festivosPorMes,
	getISODate,
	semanaSantaCompleta,
	unirFechasNoHabiles,
	vacanciaJudicial,
} from '$lib/utils/dates';
import type { CalificacionPeriodo, ClaseRegistroCalificacion, RegistroCalificacion, TipoDespacho } from '@prisma/client';
import dayjs from 'dayjs';
import _ from 'lodash';

const getInventarioInicial = (data: RegistroCalificacion[]) => {
	const minDate = _.minBy(data, 'desde')?.desde;
	if (!minDate) return 0;

	return _(data)
		.filter((d) => dayjs(d.desde).isSame(minDate))
		.sumBy('inventarioInicial');
};

const getIngresoEfectivo = (data: RegistroCalificacion[]) => {
	return _(data).sumBy('ingresoEfectivo');
};

const getIngresoEfectivoUltimoPeriodo = (data: RegistroCalificacion[]) => {
	return _(data)
		.filter((d) => getISODate(d.desde).getMonth() >= 9)
		.sumBy('ingresoEfectivo');
};

const getInventarioFinal = (data: RegistroCalificacion[], funcionarioId?: string) => {
	const maxDesde = _.maxBy(data, 'desde')?.desde;
	if (!maxDesde) return 0;

	// El inventario final de acciones de tutela del funcionario solo se descuenta si se encuentra en el último trimestre.
	if (funcionarioId && getISODate(maxDesde).getMonth() < 9) return 0;

	return _(data)
		.filter((d) => (!funcionarioId || d.funcionarioId === funcionarioId) && dayjs(d.desde).isSame(maxDesde))
		.sumBy('inventarioFinal');
};

const getEgresoTotal = (data: RegistroCalificacion[]) => _.sumBy(data, 'egresoEfectivo');

const getEgresoFuncionario = (data: RegistroCalificacion[], funcionarioId: string) => {
	return _(data)
		.filter((d) => d.funcionarioId === funcionarioId)
		.sumBy((d) => d.egresoEfectivo + d.conciliaciones);
};

const getEgresoOtrosFuncionarios = (data: RegistroCalificacion[], funcionarioId: string) => {
	return _(data)
		.filter((d) => d.funcionarioId !== funcionarioId)
		.sumBy('egresoEfectivo');
};

const getCargaBaseCalificacion = (data: RegistroCalificacion[]) => {
	const totalInventarioInicial = getInventarioInicial(data);
	const ingresoEfectivo = getIngresoEfectivo(data);
	return totalInventarioInicial + ingresoEfectivo;
};

const getRangoFechasFuncionario = (data: RegistroCalificacion[], funcionarioId: string) => {
	const dataFuncionario = _(data).filter((d) => d.funcionarioId === funcionarioId);
	const desde = dataFuncionario.minBy('desde')?.desde;
	const hasta = dataFuncionario.maxBy('desde')?.hasta;

	return { desde, hasta };
};

const generadorResultadosSubfactor =
	(funcionarioId: string, diasHabilesDespacho: number, diasHabilesFuncionario: number, hayEscritos: boolean, capacidadMaxima: number) =>
	(data: RegistroCalificacion[], dataTutelas: RegistroCalificacion[], maxResultado: number, subfactor: ClaseRegistroCalificacion) => {
		if (!data.length)
			return {
				subfactor,
				totalInventarioInicial: 0,
				cargaBaseCalificacionDespacho: 0,
				cargaBaseCalificacionFuncionario: 0,
				egresoFuncionario: 0,
				cargaProporcional: 0,
				totalSubfactor: 0,
			};

		const filtrarRegistrosCalificacionPorPeriodoFuncionario = (data: RegistroCalificacion[]) => {
			// Filtrar "data" para conservar solo los registros del funcionario desde el ingreso del
			// funcionario al despacho hasta su salida, descartando los periodos al inicio o al final
			// del año que no correspondan al funcionario calificable.

			const { desde: desdeFuncionario, hasta: hastaFuncionario } = getRangoFechasFuncionario(data, funcionarioId);

			if (!desdeFuncionario || !hastaFuncionario) return [];

			const dataFuncionario = _(data)
				.filter((d) => d.desde >= desdeFuncionario && d.desde <= hastaFuncionario)
				.value();

			return dataFuncionario;
		};

		const dataFuncionario = filtrarRegistrosCalificacionPorPeriodoFuncionario(data);
		const dataFuncTutelas = filtrarRegistrosCalificacionPorPeriodoFuncionario(dataTutelas);

		let totalInventarioInicial = getInventarioInicial(data);
		let egresoFuncionario = getEgresoFuncionario(dataFuncionario, funcionarioId);
		let egresoOtrosFuncionarios = getEgresoOtrosFuncionarios(dataFuncionario, funcionarioId);
		let cargaBaseCalificacionDespacho = getCargaBaseCalificacion(data);
		let cargaBaseCalificacionFuncionario = getCargaBaseCalificacion(dataFuncionario);

		if (subfactor === 'oral' || subfactor === 'escrito') {
			// Anteriormente se tenían en cuenta los procesos del cuarto trimestre para los juzgados de ejecución de penas,
			// Ahora se excluyen los procesos de cuarto trimestre para todos los juzgados de conformidad con el criterio de la Unidad de Carrera Judicial.
			const ingresoEfectivoUltimoPeriodo = getIngresoEfectivoUltimoPeriodo(data);
			cargaBaseCalificacionDespacho -= ingresoEfectivoUltimoPeriodo;
			const ingresoEfectivoUltimoPeriodoFunc = getIngresoEfectivoUltimoPeriodo(dataFuncionario);
			cargaBaseCalificacionFuncionario -= ingresoEfectivoUltimoPeriodoFunc;

			if ((!hayEscritos && subfactor === 'oral') || (hayEscritos && subfactor === 'escrito')) {
				totalInventarioInicial += getInventarioInicial(dataTutelas);
				egresoFuncionario += getEgresoFuncionario(dataTutelas, funcionarioId);
				egresoOtrosFuncionarios += getEgresoOtrosFuncionarios(dataFuncTutelas, funcionarioId);
				const cargaBaseTutelas = getCargaBaseCalificacion(dataTutelas);
				const inventarioFinalTutelas = getInventarioFinal(dataTutelas);
				cargaBaseCalificacionDespacho += cargaBaseTutelas - inventarioFinalTutelas;
				cargaBaseCalificacionFuncionario += getCargaBaseCalificacion(dataFuncTutelas) - getInventarioFinal(dataFuncTutelas, funcionarioId);
			}
		}

		cargaBaseCalificacionFuncionario -= egresoOtrosFuncionarios;

		// La capacidad máxima solo aplica para el subfactor "oral", de modo que para los demás subfactores se usa el valor
		// infinito para excluirlo del cálculo de la carga mínima.
		const capacidadMaximaProporcional = subfactor === 'oral' ? (capacidadMaxima * diasHabilesFuncionario) / diasHabilesDespacho : Infinity;
		const cargaProporcional = (cargaBaseCalificacionDespacho * diasHabilesFuncionario) / diasHabilesDespacho;

		// Se calcula la carga que resulta más favorable para el funcionario, es decir, la menor carga.
		const cargaMinima = Math.min(cargaProporcional, cargaBaseCalificacionFuncionario, capacidadMaximaProporcional);

		const totalSubfactor = cargaMinima ? Math.min((egresoFuncionario / cargaMinima) * maxResultado, maxResultado) : 0;

		return {
			subfactor,
			totalInventarioInicial,
			cargaBaseCalificacionDespacho,
			cargaBaseCalificacionFuncionario,
			egresoFuncionario,
			cargaProporcional,
			totalSubfactor,
		};
	};

function generarConsolidado({
	diasNoHabiles,
	registros,
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
			restan: _.sumBy(d, 'restan'),
		}))
		.sortBy('desde')
		.value();

	return agrupadoPorCategoria;
}

export function getDiasFestivosPorTipoDespacho(tipoDespacho: TipoDespacho | null) {
	if (!tipoDespacho) return festivosPorMes;

	const { especialidad, categoria } = tipoDespacho;

	if (especialidad === 'EjecucionPenas' || especialidad === 'FamiliaPromiscuo') return unirFechasNoHabiles(festivosPorMes, diaJusticia);

	if (
		categoria === 'Municipal' &&
		(especialidad === 'Penal' ||
			especialidad === 'PenalAdolescentesConocimiento' ||
			especialidad === 'PenalAdolescentesGarantias' ||
			especialidad === 'PenalGarantias' ||
			especialidad === 'PenalConocimiento' ||
			especialidad === 'PenalMixto')
	)
		return unirFechasNoHabiles(festivosPorMes, diaJusticia, semanaSantaCompleta);

	return unirFechasNoHabiles(festivosPorMes, diaJusticia, semanaSantaCompleta, vacanciaJudicial);
}

function calcularPonderada(calificaciones: { diasLaborables: number; calificacionTotalFactorEficiencia: number }[] = []) {
	if (calificaciones.length === 0) return 0;
	if (calificaciones.length === 1) return calificaciones[0].calificacionTotalFactorEficiencia;

	const totalDiasLaborados = _.sumBy(calificaciones, 'diasLaborables');
	return _(calificaciones)
		.map(({ diasLaborables, calificacionTotalFactorEficiencia }) => {
			return (calificacionTotalFactorEficiencia / totalDiasLaborados) * diasLaborables;
		})
		.sum();
}

async function actualizarDiasLaborables(calificacionId: string) {
	const calificacion = await db.calificacionPeriodo.findFirst({
		where: { id: calificacionId },
		include: { calificaciones: { include: { registrosConsolidados: true, despacho: { include: { tipoDespacho: true } } } } },
	});
	if (!calificacion) throw new Error('Calificación no encontrada');

	const registros = _(calificacion.calificaciones)
		.flatMap((calificacionDespacho) => calificacionDespacho.registrosConsolidados)
		.filter((registro) => registro.funcionarioId === calificacion.funcionarioId)
		.uniqBy('desde')
		.sortBy('desde')
		.value();

	// Determinar los periodos de tiempo en los cuales el funcionario ha trabajado en los despachos
	// De esta manera, periodos no laborados por incapacidades, licencias no remuneradas o similares se incluyen dentro del periodo del despacho correspondientes,
	// pero los periodos no laborados por trabajo en otro despacho se cuentan en un periodo por separado.
	type Periodo = { desde: Date; hasta: Date; despachoId: string };
	const periodos: Periodo[] = [];
	let despachoActual: string | null = null;
	for (const registro of registros) {
		if (despachoActual !== registro.despachoId) {
			// Si el despacho cambia o no se ha definido, se agrega un nuevo periodo
			despachoActual = registro.despachoId;
			periodos.push({ desde: registro.desde, hasta: registro.hasta, despachoId: registro.despachoId });
		} else {
			// Si el despacho no cambia, se actualiza el último periodo para extenderlo
			periodos[periodos.length - 1].hasta = registro.hasta;
		}
	}

	// Contar los días laborados por cada correspondientes para cada calificación y actualizar la base de datos.
	const diasLaborablesPorCalificacion = calificacion.calificaciones.map((calificacionDespacho) => {
		const periodosCalificacion = periodos.filter((periodo) => calificacionDespacho.despachoId === periodo.despachoId);
		const diasLaborables = periodosCalificacion.reduce((diasHabiles, periodo) => {
			const diasNoHabiles = getDiasFestivosPorTipoDespacho(calificacionDespacho.despacho.tipoDespacho);
			return diasHabiles + contarDiasHabiles(diasNoHabiles, periodo.desde, periodo.hasta);
		}, 0);
		return { calificacionId: calificacionDespacho.id, diasLaborables };
	});

	await db.$transaction(
		diasLaborablesPorCalificacion.map(({ calificacionId, diasLaborables }) =>
			db.calificacionDespacho.update({ where: { id: calificacionId }, data: { diasLaborables } })
		)
	);
}

async function generarCalificacionPonderada(calificacionId: string) {
	const calificacion = await db.calificacionPeriodo.findFirst({ where: { id: calificacionId }, include: { calificaciones: true } });
	if (!calificacion) throw new Error('Calificación no encontrada');

	const calificacionPonderada = calcularPonderada(calificacion.calificaciones);
	await db.calificacionPeriodo.update({ where: { id: calificacionId }, data: { calificacionPonderada } });
}

async function findOrCreateCalificacionPeriodo(funcionarioId: string, periodo: number) {
	const calificacionPeriodo = await db.calificacionPeriodo.findFirst({ where: { funcionarioId, periodo } });
	if (calificacionPeriodo) return calificacionPeriodo;
	return db.calificacionPeriodo.create({ data: { estado: 'borrador', funcionarioId, periodo } });
}

async function getCuentaProcesosEscritos(despachoId: string, periodo: number) {
	return db.registroCalificacion.count({
		where: { despachoId, periodo, clase: 'escrito', categoria: { not: 'Consolidado' }, cargaEfectiva: { gt: 0 } },
	});
}

async function actualizarClaseRegistros(despachoId: string, periodo: number) {
	const cuentaProcesosEscritos = await getCuentaProcesosEscritos(despachoId, periodo);
	const hayEscritos = cuentaProcesosEscritos > 0;

	const despacho = await db.despacho.findFirst({ where: { id: despachoId }, include: { tipoDespacho: true } });
	if (!despacho) return;

	const categoriasConstitucional = ['Primera Instancia Acciones Constitucionales'];
	if (hayEscritos) {
		// Cuando hay procesos escritos, estas categorías se acumulan con ellos.
		await db.registroCalificacion.updateMany({
			where: { despachoId, periodo, categoria: { in: categoriasConstitucional } },
			data: { clase: 'escrito' },
		});

		const categoriaPenalEscrito = [
			'segunda Instancia Ejecución de penas y medidas de seguridad ccto',
			'Segunda Instancia Acciones Constitucionales',
		];
		if (despacho.tipoDespacho?.especialidad.startsWith('Penal') && despacho.tipoDespacho.categoria === 'Circuito') {
			await db.registroCalificacion.updateMany({
				where: { despachoId, periodo, categoria: { in: categoriaPenalEscrito } },
				data: { clase: 'escrito' },
			});
		}
	} else {
		// Si el despacho es de control de garantías, las acciones constitucionales de primera instancia se asumen como "oral".
		const despacho = await db.despacho.findFirst({
			where: { id: despachoId },
			include: { tipoDespacho: true },
		});
		if (despacho?.tipoDespacho?.especialidad === 'PenalGarantias')
			await db.registroCalificacion.updateMany({
				where: { despachoId, periodo, categoria: { in: categoriasConstitucional } },
				data: { clase: 'oral' },
			});
	}

	// Categorías incluidas en la clase oral que deben consolidarse bajo la clase "tutelas".
	const categoriasTutelas = [
		'Incidentes de Desacato',
		'Movimiento de Tutelas',
		'Procesos con sentencia y trámite posterior incidentes de Desacato',
		'Consultas Incidentes de Desacato',
		'Movimiento de Impugnaciones',
	];
	await db.registroCalificacion.updateMany({
		where: { despachoId, periodo, categoria: { in: categoriasTutelas } },
		data: { clase: 'tutelas' },
	});
}

export async function consultarDespachosPorFuncionario(funcionarioId: string, periodo: number) {
	return (
		await db.registroCalificacion.findMany({
			where: { funcionarioId, periodo },
			select: { despacho: { select: { id: true, codigo: true, nombre: true, tipoDespachoId: true } } },
			distinct: ['despachoId'],
		})
	).map(({ despacho }) => despacho);
}

async function generarCalificacionDespacho(calificacionPeriodo: CalificacionPeriodo, despachoId: string) {
	const { funcionarioId, periodo } = calificacionPeriodo;

	const funcionario = await db.funcionario.findFirst({
		where: { id: funcionarioId },
		include: {
			// Consultar solo las novedades para el despacho y periodo para el que se genera la calificación
			novedades: {
				where: {
					despachoId,
					AND: [{ from: { lte: new Date(periodo, 11, 31) } }, { to: { gte: new Date(periodo, 0, 1) } }],
				},
			},
		},
	});
	if (!funcionario) throw new Error('Funcionario no encontrado');

	const despacho = await db.despacho.findFirst({
		where: { id: despachoId },
		include: { tipoDespacho: { include: { capacidadesMaximas: true } } },
	});
	if (!despacho) throw new Error('Despacho no encontrado');
	if (!despacho.tipoDespacho)
		throw new Error(`Se debe especificar el tipo de despacho para el ${despacho.nombre} antes de poder generar la calificación.`);

	const capacidadMaxima = await db.capacidadMaximaRespuesta.findFirst({
		where: { tipoDespachoId: despacho.tipoDespacho.id, periodo },
	});
	if (!capacidadMaxima)
		throw new Error(
			`No se puede generar la calificación porque el tipo de despacho ${despacho.tipoDespacho.nombre} no tiene capacidad máxima de respuesta para el periodo ${periodo}.`
		);

	let audiencias = await db.registroAudiencias.findFirst({
		where: { periodo, funcionarioId, despachoId: despacho.id },
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
				aplazadasNoJustificadas: 0,
			},
		});

	await actualizarClaseRegistros(despachoId, periodo);

	const diasNoHabiles = getDiasFestivosPorTipoDespacho(despacho.tipoDespacho);

	const registros = await db.registroCalificacion.findMany({
		where: { despachoId, periodo, categoria: { not: 'Consolidado' } },
		orderBy: { desde: 'asc' },
	});
	const diasHabilesDespacho = contarDiasHabiles(diasNoHabiles, registros[0].desde, registros[registros.length - 1].hasta);

	const registrosTutelas = registros.filter((registro) => registro.clase === 'tutelas');
	const consolidadoTutelas = generarConsolidado({ diasNoHabiles, registros: registrosTutelas });

	const diasHabilesVinculacion = consolidadoTutelas
		.filter((registro) => registro.funcionarioId === funcionario.id)
		.map((registro) => registro.dias)
		.reduce((a, b) => a + b, 0);

	const diasDescontados = funcionario.novedades ? funcionario.novedades.reduce((dias, novedad) => dias + novedad.days, 0) : 0;

	// Dias de las novedades que se encuentran dentro de los rangos de tiempo efectivamente laborado.
	const diasDescontables = funcionario.novedades
		? funcionario.novedades.reduce((dias, novedad) => {
				return dias + novedad.diasDescontables;
			}, 0)
		: 0;

	const diasHabilesLaborados = diasHabilesVinculacion - diasDescontables;

	const cuentaProcesosEscritos = await getCuentaProcesosEscritos(despachoId, periodo);
	const hayEscritos = cuentaProcesosEscritos > 0;

	const generarResultadosSubfactor = generadorResultadosSubfactor(
		funcionario.id,
		diasHabilesDespacho,
		diasHabilesLaborados,
		hayEscritos,
		capacidadMaxima.cantidad
	);

	const registrosOral = registros.filter((registro) => registro.clase === 'oral');
	const consolidadoOral = generarConsolidado({ diasNoHabiles, registros: registrosOral });

	const esDespachoGarantias = ['PenalAdolescentesGarantias', 'PenalGarantias'].includes(despacho.tipoDespacho.especialidad);
	const maximoOral = esDespachoGarantias ? 45 : 40;
	const oral = generarResultadosSubfactor(registrosOral, hayEscritos ? [] : registrosTutelas, maximoOral, 'oral');

	const registrosGarantias = registros.filter((registro) => registro.clase === 'garantias');
	const consolidadoGarantias = generarConsolidado({ diasNoHabiles, registros: registrosGarantias });
	const garantias = generarResultadosSubfactor(registrosGarantias, [], 45, 'garantias');

	const registrosEscrito = registros.filter((registro) => registro.clase === 'escrito');
	const consolidadoEscrito = generarConsolidado({ diasNoHabiles, registros: registrosEscrito });
	const escrito = generarResultadosSubfactor(registrosEscrito, hayEscritos ? registrosTutelas : [], 45, 'escrito');

	const sumaAudiencias = audiencias.atendidas + audiencias.aplazadasAjenas + audiencias.aplazadasJustificadas;
	const calificacionAudiencias = audiencias.programadas === 0 || esDespachoGarantias ? 0 : (sumaAudiencias / audiencias.programadas) * 5;

	const factorOralMasAudiencias = oral.totalSubfactor + calificacionAudiencias;

	const baseTutelas = getCargaBaseCalificacion(registrosTutelas);
	const baseOral = getCargaBaseCalificacion(registrosOral);
	const baseGarantias = getCargaBaseCalificacion(registrosGarantias);
	const baseEscrito = getCargaBaseCalificacion(registrosEscrito);
	const egresoTutelas = getEgresoTotal(registrosTutelas);
	const egresoOral = getEgresoTotal(registrosOral);
	const egresoGarantias = getEgresoTotal(registrosGarantias);
	const egresoEscrito = getEgresoTotal(registrosEscrito);

	const totalesParaPromedio = [factorOralMasAudiencias, garantias.totalSubfactor, escrito.totalSubfactor].filter(Boolean);
	const calificacionTotalFactorEficiencia = totalesParaPromedio.reduce((sum, val) => sum + val, 0) / (totalesParaPromedio.length || 1);

	const consolidados = [...consolidadoOral, ...consolidadoTutelas, ...consolidadoGarantias, ...consolidadoEscrito];

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
		calificacionTotalFactorEficiencia,
	};

	const calificacion = await db.calificacionDespacho.findFirst({
		where: { calificacionId: calificacionPeriodo.id, despachoId: despacho.id },
	});

	if (calificacion) {
		await db.registroCalificacion.deleteMany({ where: { calificacionId: calificacion.id, categoria: 'Consolidado' } });
		await db.calificacionSubfactor.deleteMany({ where: { calificacionId: calificacion.id } });
		await db.calificacionDespacho.update({ where: { id: calificacion.id }, data });
	} else {
		await db.calificacionDespacho.create({ data });
	}
}

export async function generarCalificacionFuncionario(funcionarioId: string, periodo: number): Promise<string> {
	const calificacionPeriodo = await findOrCreateCalificacionPeriodo(funcionarioId, periodo);
	if (calificacionPeriodo.estado === 'aprobada') return calificacionPeriodo.id;

	const despachos = await consultarDespachosPorFuncionario(funcionarioId, periodo);

	for await (const despacho of despachos) {
		await generarCalificacionDespacho(calificacionPeriodo, despacho.id);
	}

	await actualizarDiasLaborables(calificacionPeriodo.id);

	await generarCalificacionPonderada(calificacionPeriodo.id);

	return calificacionPeriodo.id;
}
