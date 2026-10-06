import assert from 'node:assert/strict';
import { test } from 'vite-plus/test';
import type { ISODateString } from '#lib/types.ts';
import { suggestGrade } from './student.ts';

const birth = (v: string) => v as ISODateString;

test('suggestGrade - 출생 연도로 학년을 추천한다', () => {
	const now = new Date(2026, 9, 6);
	assert.equal(suggestGrade(birth('2019-05-01'), now), '초1');
	assert.equal(suggestGrade(birth('2014-12-31'), now), '초6');
	assert.equal(suggestGrade(birth('2009-01-01'), now), '고2');
});

test('suggestGrade - 3월 전에는 이전 학년도로 계산한다', () => {
	assert.equal(suggestGrade(birth('2019-05-01'), new Date(2026, 1, 28)), undefined);
	assert.equal(suggestGrade(birth('2019-05-01'), new Date(2026, 2, 1)), '초1');
});

test('suggestGrade - 고등학교 이후는 성인이다', () => {
	assert.equal(suggestGrade(birth('2000-01-01'), new Date(2026, 9, 6)), '성인');
});
