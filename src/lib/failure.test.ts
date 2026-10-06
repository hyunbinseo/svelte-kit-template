import assert from 'node:assert/strict';
import { test } from 'vite-plus/test';
import { fail, isFailure } from './failure.ts';

test('isFailure - fail()로 만든 값을 인식한다', () => {
	assert(isFailure(fail('CODE')));
	assert.equal(fail('CODE').failure, 'CODE');
});

test('isFailure - 다른 값은 무시한다', () => {
	for (const value of [undefined, null, 'CODE', { id: '1' }]) {
		assert.equal(isFailure(value), false);
	}
});
