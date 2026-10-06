export const gradeShortToFull = {
	초1: '초등학교 1학년',
	초2: '초등학교 2학년',
	초3: '초등학교 3학년',
	초4: '초등학교 4학년',
	초5: '초등학교 5학년',
	초6: '초등학교 6학년',
	중1: '중학교 1학년',
	중2: '중학교 2학년',
	중3: '중학교 3학년',
	고1: '고등학교 1학년',
	고2: '고등학교 2학년',
	고3: '고등학교 3학년',
	성인: '성인',
} as const;

export const shortGrades = Object.keys(gradeShortToFull) as readonly ShortGrade[];
export type ShortGrade = keyof typeof gradeShortToFull;

export type StudentToCareCenterRemovedReason = (typeof studentToCareCenterRemovedReasons)[number];
export const studentToCareCenterRemovedReasons = [
	'기관_비활성화', //
	'전출',
	'퇴소',
] as const;

export const manualStudentRemovedReasons = [
	'전출',
	'퇴소',
] as const satisfies StudentToCareCenterRemovedReason[];
