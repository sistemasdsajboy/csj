import { describe, it, expect } from 'vitest';
import { countLaborDaysBetweenDates, dateIsHoliday } from './dates';

describe('dateIsHoliday', () => {
	it('returns true when the specified date is a holyday', () => {
		expect(dateIsHoliday(new Date('2023-06-12'))).toBe(true);
		expect(dateIsHoliday(new Date('2023-07-20'))).toBe(true);
	});

	it('returns true when the specified date is a weekend', () => {
		expect(dateIsHoliday(new Date('2023-07-22'))).toBe(true);
		expect(dateIsHoliday(new Date('2023-07-23'))).toBe(true);
	});

	it('returns false when the specified date is a labor day', () => {
		expect(dateIsHoliday(new Date('2023-07-24'))).toBe(false);
	});
});

describe('countLaborDaysBetweenDates', () => {
	it('returns the expected day count', () => {
		expect(countLaborDaysBetweenDates(new Date('2023-06-01'), new Date('2023-06-09'))).toBe(7);
		expect(countLaborDaysBetweenDates(new Date('2023-06-01'), new Date('2023-06-30'))).toBe(20);
		expect(countLaborDaysBetweenDates(new Date('2023-07-01'), new Date('2023-07-31'))).toBe(19);
		expect(countLaborDaysBetweenDates(new Date('2023-01-01'), new Date('2023-12-31'))).toBe(227);
	});
});
