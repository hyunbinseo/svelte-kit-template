import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeParse } from 'valibot';
import { InternalAbsolutePathSchema } from './valibot.ts';

test('InternalAbsolutePathSchema allows same-origin paths', () => {
	const result = safeParse(InternalAbsolutePathSchema, '/posts?page=2#top');
	assert(result.success);
	assert.equal(result.output, '/posts?page=2#top');
});

test('InternalAbsolutePathSchema blocks other origins', () => {
	for (const input of ['https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com']) {
		assert.equal(
			safeParse(InternalAbsolutePathSchema, input).success,
			false,
			JSON.stringify(input),
		);
	}
});

test('InternalAbsolutePathSchema blocks relative paths', () => {
	assert.equal(safeParse(InternalAbsolutePathSchema, 'posts').success, false);
});
