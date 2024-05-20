import dayjs from 'dayjs';

export const holidaysByYear: Record<number, Array<Array<number>>> = {
	2021: [
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
		[],
		[22, 29, 30, 31],
		[1, 2],
		[1, 17],
		[7, 14],
		[5, 20],
		[7, 16],
		[],
		[18],
		[1, 15],
		[8, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31]
	],
	2022: [
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		[],
		[21],
		[11, 12, 13, 14, 15],
		[1, 30],
		[20, 27],
		[4, 20],
		[7, 15],
		[],
		[17],
		[7, 14],
		[8, 20, 21, 22, 23, 26, 27, 28, 29, 30]
	],
	2023: [
		[2, 3, 4, 5, 6, 9, 10],
		[],
		[20],
		[3, 4, 5, 6, 7],
		[1, 22],
		[12, 19],
		[3, 20],
		[7, 21],
		[],
		[16],
		[6, 13],
		[8, 20, 21, 22, 25, 26, 27, 28, 29]
	],
	2024: [
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		[],
		[25, 26, 27, 28, 29],
		[],
		[1, 13],
		[3, 10],
		[1],
		[7, 19],
		[],
		[14],
		[4, 11],
		[17, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]
	],
	2025: [
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		[],
		[24],
		[14, 15, 16, 17, 18],
		[1],
		[2, 23, 30],
		[],
		[7, 18],
		[],
		[13],
		[3, 17],
		[8, 17, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]
	]
};

export const dateIsHoliday = (date: Date) => {
	const isWeekend = date.getDay() === 5 || date.getDay() === 6;
	const dayjsDate = dayjs(date).add(1, 'day');
	const holiday = Boolean(
		holidaysByYear[dayjsDate.year()]?.[dayjsDate.month()]?.includes(dayjsDate.date())
	);
	return isWeekend || holiday;
};

export const countLaborDaysBetweenDates = (from: Date, to: Date) => {
	let count = 0;
	let day = dayjs(from);
	while (day.isBefore(to) || day.isSame(to)) {
		if (!dateIsHoliday(day.toDate())) count++;
		day = day.add(1, 'day');
	}
	return count;
};

export const formatDate = (date: Date) => dayjs(date).format('DD/MM/YYYY');
