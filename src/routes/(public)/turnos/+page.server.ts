import {
	abreviacionesDias,
	dateIsHoliday,
	dateIsWeekend,
	diaJusticia,
	festivosPorMes,
	semanaSantaCompleta,
	unirFechasNoHabiles,
	utcDate,
} from '$lib/utils/dates';
import type { Actions, PageServerLoad } from './$types';

// "no-compensada": Periodos designados que no se compensan en el reparto de días: semana santa y periodos de vacaciones
type TipoAsignacion = 'compensada' | 'no-compensada';
type Asignaciones = Record<string, { funcionario: string; tipo: TipoAsignacion }>;
type Exclusiones = Record<string, string[]>;

const getTurnosDataForXlsxExport = (
	funcionarios: string[],
	turnos: Record<string, string>,
	asignaciones: Asignaciones,
	exclusiones: Exclusiones
) => {
	const encabezadoPagina = [
		['Asignación de turnos'],
		[],
		['Mes', ...Object.keys(turnos).map((fecha) => fecha.slice(5, 7))],
		['Dia', ...Object.keys(turnos).map((fecha) => abreviacionesDias[utcDate(new Date(fecha)).getDay()])],
		['', ...Object.keys(turnos).map((fecha) => fecha.slice(8))],
	];

	const filas = funcionarios.map((funcionario) => [
		funcionario,
		...Object.entries(turnos).map(([fecha, funcionarioTurno]) => {
			if (asignaciones[fecha]?.funcionario === funcionario)
				if (asignaciones[fecha]?.tipo === 'compensada') return '•C';
				else return '•N';
			else if (exclusiones[fecha]?.includes(funcionario)) return 'E';
			else if (funcionarioTurno === funcionario) return '•';
			return '';
		}),
	]);

	return [{ name: 'Turnos', data: [...encabezadoPagina, ...filas], options: {} }];
};

export const load = (async ({}) => {
	const añoSiguiente = new Date().getFullYear() + 1;

	const funcionarios = [
		'Funcionario o Despacho 1',
		'Funcionario o Despacho 2',
		'Funcionario o Despacho 3',
		'Funcionario o Despacho 4',
		'Funcionario o Despacho 5',
	].join('\n');

	return {
		form: {
			fechaInicial: `${añoSiguiente}-01-11`,
			fechaFinal: `${añoSiguiente}-12-19`,
			funcionarios,
			funcionarioPrimerTurno: '',
			duracionPeriodo: 'diario',
			asignaciones: {} as Asignaciones,
			exclusiones: {} as Exclusiones,
		},
	};
}) satisfies PageServerLoad;

function verificarDia(fecha: string, soloFestivos: boolean = false) {
	let fechaDate = new Date(fecha);
	fechaDate = utcDate(fechaDate);
	const diasFestivos = soloFestivos
		? unirFechasNoHabiles(festivosPorMes, diaJusticia, semanaSantaCompleta)
		: unirFechasNoHabiles(festivosPorMes, diaJusticia);
	const esFestivo = dateIsHoliday(diasFestivos, fechaDate);
	const esFinDeSemana = dateIsWeekend(fechaDate);
	if (esFinDeSemana || !esFestivo) return null;
	const esPuente = fechaDate.getDay() === 1 || fechaDate.getDay() === 5;
	return esPuente ? 'puente' : 'festivo';
}

function crearConteoInicial(funcionarios: string[]) {
	return funcionarios.reduce(
		(conteo, funcionario) => {
			conteo[funcionario] = 0;
			return conteo;
		},
		{} as Record<string, number>
	);
}

const getSiguenteFuncionarioDiaFestivo = (
	conteoFestivos: Record<string, number>,
	conteoTipoDia: Record<string, number>,
	excluidos: string[],
	indiceTurno: number,
	funcionarios: string[]
) => {
	const minFestivos = Math.min(...Object.values(conteoFestivos));
	const minTipoDia = Math.min(...Object.values(conteoTipoDia));
	const funcionarioActual = funcionarios[indiceTurno];
	const indicePrimerTurno = funcionarios.indexOf(funcionarioActual);

	funcionarios = funcionarios
		.slice(indicePrimerTurno)
		.concat(funcionarios.slice(0, indicePrimerTurno))
		.filter((f) => !excluidos?.includes(f));

	const funcionarioConMenosFestivos = funcionarios.filter((f) => conteoFestivos[f] === minFestivos);
	const funcionarioConMenosTipoDia = funcionarios.filter((f) => conteoTipoDia[f] === minTipoDia);
	const opciones = funcionarioConMenosTipoDia.filter((f) => funcionarioConMenosFestivos.includes(f));

	return opciones[0] || funcionarioActual;
};

export const actions = {
	async default({ request }) {
		const formData = await request.formData();

		const fechaInicial = formData.get('fechaInicial')?.toString();
		const fechaFinal = formData.get('fechaFinal')?.toString();
		const funcionariosTexto = formData.get('funcionarios')?.toString();
		let funcionarioPrimerTurno = formData.get('funcionarioPrimerTurno')?.toString();
		const duracionPeriodo = formData.get('duracionPeriodo')?.toString();
		const asignaciones = JSON.parse(formData.get('asignaciones')?.toString() || '{}') as Asignaciones;
		const exclusiones = JSON.parse(formData.get('exclusiones')?.toString() || '{}') as Exclusiones;

		const form = {
			fechaInicial,
			fechaFinal,
			funcionarios: funcionariosTexto,
			funcionarioPrimerTurno,
			duracionPeriodo,
			asignaciones,
			exclusiones,
		};

		if (!funcionariosTexto) return { success: false, message: 'Debe especificar la lista de funcionarios', form };

		const funcionarios = funcionariosTexto
			?.split('\r\n')
			.map((funcionario) => funcionario.trim())
			.sort()
			.filter(Boolean);

		if (funcionarios.length !== new Set(funcionarios).size)
			return { success: false, message: 'La lista de funcionarios contiene duplicados', form };

		if (!funcionarioPrimerTurno) funcionarioPrimerTurno = funcionarios[0];

		if (!fechaInicial || !fechaFinal || !funcionariosTexto || !funcionarioPrimerTurno || !duracionPeriodo)
			return { success: false, message: 'Debe diligenciar todos los campos requeridos', form };

		if (!funcionarios.includes(funcionarioPrimerTurno))
			return { success: false, message: 'El funcionario del primer turno no se encuentra en la lista de funcionarios', form };

		let fecha = utcDate(new Date(fechaInicial));
		const fechaFinalDate = utcDate(new Date(fechaFinal));

		if (fecha >= fechaFinalDate) return { success: false, message: 'La fecha inicial debe ser anterior a la fecha final', form };

		let indiceTurno = funcionarios.indexOf(funcionarioPrimerTurno);
		const turnos: Record<string, string> = {};

		const conteoPeriodos: Record<string, number> = crearConteoInicial(funcionarios);
		const conteoFestivos: Record<string, number> = { ...conteoPeriodos };
		const conteoPuentes: Record<string, number> = { ...conteoPeriodos };
		const conteoNoPuentes: Record<string, number> = { ...conteoPeriodos };

		const exclusionesPorCompensar: string[] = [];
		const asignacionesPorCompensar: string[] = [];

		while (fecha <= fechaFinalDate) {
			const fechaStr = fecha.toISOString().split('T')[0];
			const tipoDia = verificarDia(fechaStr, duracionPeriodo === 'diario-festivos');
			const asignacionManual = asignaciones[fechaStr];
			const esFinDeSemana = dateIsWeekend(fecha);
			const esFinDePeriodo =
				duracionPeriodo === 'diario' || duracionPeriodo === 'diario-festivos' || (duracionPeriodo === 'semanal' && fecha.getDay() === 0);
			// Ignorar exclusiones de días en los que se excluye a todos los funcionarios
			const exclusionesEnFecha = exclusiones[fechaStr]?.length === funcionarios.length ? [] : exclusiones[fechaStr];
			const compensacionEstaExcluida = exclusionesEnFecha?.includes(exclusionesPorCompensar[exclusionesPorCompensar.length - 1]);

			if (asignacionManual?.tipo === 'compensada' || asignacionManual?.tipo === 'no-compensada') {
				turnos[fechaStr] = asignacionManual.funcionario;
				if (asignacionManual.tipo === 'compensada') asignacionesPorCompensar.push(asignacionManual.funcionario);
			} else if (exclusionesPorCompensar.length > 0 && !compensacionEstaExcluida) {
				turnos[fechaStr] = exclusionesPorCompensar.pop()!;
			} else {
				// Asignar al siguiente funcionario en la lista.
				if (tipoDia) {
					const tipoConteo = tipoDia === 'puente' ? conteoPuentes : conteoNoPuentes;
					const siguiente = getSiguenteFuncionarioDiaFestivo(conteoFestivos, tipoConteo, exclusionesEnFecha, indiceTurno, funcionarios);
					if (siguiente !== funcionarios[indiceTurno]) exclusionesPorCompensar.push(funcionarios[indiceTurno]);

					turnos[fechaStr] = siguiente;

					if (esFinDePeriodo) indiceTurno = (indiceTurno + 1) % funcionarios.length;
				} else if (duracionPeriodo !== 'diario-festivos' || esFinDeSemana) {
					while (exclusionesEnFecha?.includes(funcionarios[indiceTurno]) || asignacionesPorCompensar.includes(funcionarios[indiceTurno])) {
						if (asignacionesPorCompensar.includes(funcionarios[indiceTurno])) asignacionesPorCompensar.pop();
						else exclusionesPorCompensar.push(funcionarios[indiceTurno]);
						indiceTurno = (indiceTurno + 1) % funcionarios.length;
					}
					turnos[fechaStr] = funcionarios[indiceTurno];

					if (esFinDePeriodo) indiceTurno = (indiceTurno + 1) % funcionarios.length;
				}
			}

			// Registrar conteo de dias/semanas asignadas para cada funcionario para controlar el reparto equitativo de los días
			let funcionarioAsignado = turnos[fechaStr];
			const diaCompensado = !(asignacionManual?.tipo === 'no-compensada');
			if (diaCompensado && esFinDePeriodo) conteoPeriodos[funcionarioAsignado] = (conteoPeriodos[funcionarioAsignado] || 0) + 1;

			if (diaCompensado && duracionPeriodo === 'diario' && tipoDia) {
				conteoFestivos[funcionarioAsignado] = (conteoFestivos[funcionarioAsignado] || 0) + 1;
				if (tipoDia === 'festivo') conteoNoPuentes[funcionarioAsignado] = (conteoNoPuentes[funcionarioAsignado] || 0) + 1;
				else if (tipoDia === 'puente') conteoPuentes[funcionarioAsignado] = (conteoPuentes[funcionarioAsignado] || 0) + 1;
			}

			fecha = new Date(fecha.setDate(fecha.getDate() + 1));
		}

		const turnosXlsxData = getTurnosDataForXlsxExport(funcionarios, turnos, asignaciones, exclusiones);

		return { success: true, form, turnos, conteoPeriodos, conteoFestivos, conteoPuentes, conteoNoPuentes, turnosXlsxData };
	},
} satisfies Actions;
