import assert from 'node:assert/strict';
import { safeParse } from 'valibot';
import { describe, test } from 'vite-plus/test';
import { InternalAbsolutePathSchema } from './valibot.ts';

describe('InternalAbsolutePathSchema', () => {
	test('allows same-origin paths', () => {
		const result = safeParse(InternalAbsolutePathSchema, '/posts?page=2#top');
		assert(result.success);
		assert.equal(result.output, '/posts?page=2#top');
	});

	test('blocks other origins', () => {
		for (const input of ['https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com']) {
			assert.equal(
				safeParse(InternalAbsolutePathSchema, input).success,
				false,
				JSON.stringify(input),
			);
		}
	});

	test('blocks relative paths', () => {
		assert.equal(safeParse(InternalAbsolutePathSchema, 'posts').success, false);
	});
});
