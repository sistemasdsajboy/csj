import dayjs from 'dayjs';
import _ from 'lodash';

export const festivosPorMes: Record<string, Array<number>> = {
	'2021-1': [1, 11],
	'2021-3': [22],
	'2021-4': [1, 2],
	'2021-5': [1, 17],
	'2021-6': [7, 14],
	'2021-7': [5, 20],
	'2021-8': [7, 16],
	'2021-10': [18],
	'2021-11': [1, 15],
	'2021-12': [8, 25],
	'2022-1': [1, 10],
	'2022-3': [21],
	'2022-4': [14, 15],
	'2022-5': [1, 30],
	'2022-6': [20, 27],
	'2022-7': [4, 20],
	'2022-8': [7, 15],
	'2022-10': [17],
	'2022-11': [7, 14],
	'2022-12': [8, 25],
	'2023-1': [1, 9],
	'2023-3': [20],
	'2023-4': [6, 7],
	'2023-5': [1, 22],
	'2023-6': [12, 19],
	'2023-7': [3, 20],
	'2023-8': [7, 21],
	'2023-10': [16],
	'2023-11': [6, 13],
	'2023-12': [8, 25],
	'2024-1': [1, 8],
	'2024-3': [28, 29],
	'2024-5': [1, 13],
	'2024-6': [3, 10],
	'2024-7': [1],
	'2024-8': [7, 19],
	'2024-10': [14],
	'2024-11': [4, 11],
	'2024-12': [8, 25],
	'2025-1': [1, 6],
	'2025-3': [24],
	'2025-4': [17, 18],
	'2025-5': [1],
	'2025-6': [2, 23, 30],
	'2025-8': [7, 18],
	'2025-10': [13],
	'2025-11': [3, 17],
	'2025-12': [8, 25],
};

export const diaJusticia = {
	'2021-12': [17],
	'2022-12': [17],
	'2023-12': [17],
	'2024-12': [17],
	'2025-12': [17],
};

export const semanaSantaCompleta = {
	'2021-3': [29, 30, 31],
	'2021-4': [1, 2],
	'2022-4': [11, 12, 13, 14, 15],
	'2023-4': [3, 4, 5, 6, 7],
	'2024-3': [25, 26, 27, 28, 29],
	'2025-4': [14, 15, 16, 17, 18],
};

export const vacanciaJudicial = {
	'2021-1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	'2021-12': [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
	'2022-1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	'2022-12': [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
	'2023-1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	'2023-12': [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
	'2024-1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	'2024-12': [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
	'2025-1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	'2025-12': [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
};

export const nombresMeses: Record<string, string> = {
	'1': 'Enero',
	'2': 'Febrero',
	'3': 'Marzo',
	'4': 'Abril',
	'5': 'Mayo',
	'6': 'Junio',
	'7': 'Julio',
	'8': 'Agosto',
	'9': 'Septiembre',
	'10': 'Octubre',
	'11': 'Noviembre',
	'12': 'Diciembre',
};

export const abreviacionesDias: Record<string, string> = {
	'0': 'D',
	'1': 'L',
	'2': 'M',
	'3': 'I',
	'4': 'J',
	'5': 'V',
	'6': 'S',
};

export const unirFechasNoHabiles = (...excludedDates: Array<Record<string, Array<number>>>): Record<string, Array<number>> => {
	const mergeArrays = (obj: Array<number> = [], src: Array<number> = []) => [...new Set([...obj, ...src])];
	return excludedDates.reduce((prev, curr) => _.mergeWith(prev, curr, mergeArrays), {});
};

export const utcDate = (date: Date) => new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export const dateIsWeekend = (date: Date) => {
	date = utcDate(date);
	return date.getDay() === 0 || date.getDay() === 6;
};

export const dateIsHoliday = (excludedDates: Record<string, Array<number>>, date: Date) => {
	date = utcDate(date);
	const dayjsDate = dayjs(date.toString());
	const holiday = Boolean(excludedDates[`${dayjsDate.year()}-${dayjsDate.month() + 1}`]?.includes(dayjsDate.date()));
	return holiday;
};

export const contarDiasHabiles = (excludedDates: Record<string, Array<number>>, from: Date, to: Date) => {
	let count = 0;
	let day = dayjs(from);
	while (day.isBefore(to) || day.isSame(to)) {
		if (!dateIsHoliday(excludedDates, day.toDate()) && !dateIsWeekend(day.toDate())) count++;
		day = day.add(1, 'day');
	}
	return count;
};

// TODO: Just using .format('DD/MM/YYYY') on the db date cause some dates to be shown as the previous day.
const getISODateDayJs = (date: Date) => dayjs(date.toISOString().slice(0, 10));

export const getISODate = (date: Date) => getISODateDayJs(date).toDate();

export const formatDate = (date: Date) => getISODateDayJs(date).endOf('day').format('DD/MM/YYYY');
