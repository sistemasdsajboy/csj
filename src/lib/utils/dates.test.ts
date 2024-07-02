import { describe, expect, it } from 'vitest';
import {
	contarDiasHabiles,
	dateIsHoliday,
	festivosPorMes as f,
	mergeExcludedDates
} from './dates';

describe('dateIsHoliday', () => {
	it('returns true when the specified date is a holyday', () => {
		expect(dateIsHoliday(f, new Date('2023-06-12'))).toBe(true);
		expect(dateIsHoliday(f, new Date('2023-07-20'))).toBe(true);
	});

	it('returns true when the specified date is a weekend', () => {
		expect(dateIsHoliday(f, new Date('2023-07-22'))).toBe(true);
		expect(dateIsHoliday(f, new Date('2023-07-23'))).toBe(true);
	});

	it('returns false when the specified date is a labor day', () => {
		expect(dateIsHoliday(f, new Date('2023-07-24'))).toBe(false);
	});
});

describe('contarDiasHabiles', () => {
	it('returns the expected day count', () => {
		expect(contarDiasHabiles(f, new Date('2023-06-01'), new Date('2023-06-09'))).toBe(7);
		expect(contarDiasHabiles(f, new Date('2023-06-01'), new Date('2023-06-30'))).toBe(20);
		expect(contarDiasHabiles(f, new Date('2023-07-01'), new Date('2023-07-31'))).toBe(19);
		expect(contarDiasHabiles(f, new Date('2023-01-01'), new Date('2023-12-31'))).toBe(243);
		expect(contarDiasHabiles(f, new Date('2023-04-28'), new Date('2023-04-28'))).toBe(1);
	});
});

describe('mergeExcludedDates', () => {
	it('returns the expected merged object with excluded dates', () => {
		expect(mergeExcludedDates(f, f)).toEqual(f);
		expect(mergeExcludedDates({ '2023-1': [1, 2, 3] })).toEqual({ '2023-1': [1, 2, 3] });
		expect(mergeExcludedDates({ '2023-1': [1, 2, 3] }, { '2023-2': [3, 4, 5] })).toEqual({
			'2023-1': [1, 2, 3],
			'2023-2': [3, 4, 5]
		});
		expect(mergeExcludedDates({ '2023-1': [1, 2, 3] }, { '2023-1': [3, 4, 5] })).toEqual({
			'2023-1': [1, 2, 3, 4, 5]
		});
	});
});
