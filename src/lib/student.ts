import { nonEmpty, pipe, string, trim } from 'valibot';
import { shortGrades, type ShortGrade } from '#lib/enums/student.ts';
import type { ISODateString } from '#lib/types.ts';

// Korean school year starts in March.
const SCHOOL_YEAR_START_MONTH = 3;

export const suggestGrade = (birth: ISODateString, now = new Date()): ShortGrade | undefined => {
	const schoolYear =
		now.getMonth() + 1 >= SCHOOL_YEAR_START_MONTH ? now.getFullYear() : now.getFullYear() - 1;

	// Children born in year Y enter first grade in March of Y + 7.
	const year = schoolYear - Number(birth.slice(0, 4)) - 6;
	if (year < 1) return undefined;

	return shortGrades[Math.min(year, shortGrades.length) - 1];
};

export const StudentNameSchema = pipe(string(), trim(), nonEmpty('이름을 입력해 주세요.'));
