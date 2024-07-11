import { describe, expect, it } from 'vitest';
import {
	contarDiasHabiles,
	dateIsHoliday,
	dateIsWeekend,
	festivosPorMes as f,
	unirFechasNoHabiles
} from './dates';

describe('dateIsWeekend', () => {
	it('returns true when the specified date is a weekend', () => {
		expect(dateIsWeekend(new Date('2023-07-01T05:00:00.000+00:00'))).toBe(true); // Sábado
		expect(dateIsWeekend(new Date('2023-07-01'))).toBe(true); // Sábado
		expect(dateIsWeekend(new Date('2023-07-22'))).toBe(true); // Sábado
		expect(dateIsWeekend(new Date('2023-07-22T05:00:00.000+00:00'))).toBe(true); // Sábado
		expect(dateIsWeekend(new Date('2023-07-23'))).toBe(true); // Domingo
		expect(dateIsWeekend(new Date('2023-07-23T05:00:00.000+00:00'))).toBe(true);
		expect(dateIsWeekend(new Date('2022-12-31'))).toBe(true);
		expect(dateIsWeekend(new Date('2022-12-31T05:00:00.000+00:00'))).toBe(true);
	});

	it('returns false when the specified date is not a weekend', () => {
		expect(dateIsWeekend(new Date('2023-07-21'))).toBe(false);
		expect(dateIsWeekend(new Date('2023-07-21T05:00:00.000+00:00'))).toBe(false);
		expect(dateIsWeekend(new Date('2022-12-30'))).toBe(false);
		expect(dateIsWeekend(new Date('2022-12-30T05:00:00.000+00:00'))).toBe(false);
	});
});

describe('dateIsHoliday', () => {
	it('returns true when the specified date is a holyday', () => {
		expect(dateIsHoliday(f, new Date('2023-06-12'))).toBe(true);
		expect(dateIsHoliday(f, new Date('2023-07-20'))).toBe(true);
		expect(dateIsHoliday(f, new Date('2023-05-01T05:00:00.000+00:00'))).toBe(true);
		expect(dateIsHoliday(f, new Date('2023-05-01'))).toBe(true);
		expect(dateIsHoliday(f, new Date('2023-05-22T05:00:00.000+00:00'))).toBe(true);
		expect(dateIsHoliday(f, new Date('2023-05-22'))).toBe(true);
	});

	it('returns false when the specified date is a labor day', () => {
		expect(dateIsHoliday(f, new Date('2023-07-24'))).toBe(false);
		expect(dateIsHoliday(f, new Date('2023-05-02'))).toBe(false);
		expect(dateIsHoliday(f, new Date('2023-05-02T05:00:00.000+00:00'))).toBe(false);
	});
});

describe('contarDiasHabiles', () => {
	it('returns the expected day count', () => {
		expect(
			contarDiasHabiles(
				f,
				new Date('2023-04-01T05:00:00.000+00:00'),
				new Date('2023-04-30T05:00:00.000+00:00')
			)
		).toBe(18);
		expect(contarDiasHabiles(f, new Date('2023-06-01'), new Date('2023-06-09'))).toBe(7);
		expect(contarDiasHabiles(f, new Date('2023-05-01'), new Date('2023-05-31'))).toBe(21);
		expect(
			contarDiasHabiles(
				f,
				new Date('2023-05-01T05:00:00.000+00:00'),
				new Date('2023-05-31T05:00:00.000+00:00')
			)
		).toBe(21);
		expect(contarDiasHabiles(f, new Date('2023-07-01'), new Date('2023-07-31'))).toBe(19);
		expect(contarDiasHabiles(f, new Date('2023-01-01'), new Date('2023-12-31'))).toBe(243);
		expect(contarDiasHabiles(f, new Date('2023-04-28'), new Date('2023-04-28'))).toBe(1);
	});
});

describe('unirFechasNoHabiles', () => {
	it('returns the expected merged object with excluded dates', () => {
		expect(unirFechasNoHabiles(f, f)).toEqual(f);
		expect(unirFechasNoHabiles({ '2023-1': [1, 2, 3] })).toEqual({ '2023-1': [1, 2, 3] });
		expect(unirFechasNoHabiles({ '2023-1': [1, 2, 3] }, { '2023-2': [3, 4, 5] })).toEqual({
			'2023-1': [1, 2, 3],
			'2023-2': [3, 4, 5]
		});
		expect(unirFechasNoHabiles({ '2023-1': [1, 2, 3] }, { '2023-1': [3, 4, 5] })).toEqual({
			'2023-1': [1, 2, 3, 4, 5]
		});
	});
});
