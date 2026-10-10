import assert from 'node:assert/strict';
import { test } from 'vite-plus/test';
import { picked } from './pick.ts';

const setup = () => picked<{ a: string; b?: string; c: string }>()(['a', 'b'], (data) => data);

test('picked drops unlisted keys and skips missing ones', () => {
	const query = setup();
	const data = { a: 'a', c: 'c' };

	assert.deepEqual(query(data), { a: 'a' });
});

test('picked keeps present optional keys', () => {
	const query = setup();
	const data = { a: 'a', b: 'b', c: 'c' };

	assert.deepEqual(query(data), { a: 'a', b: 'b' });
});
