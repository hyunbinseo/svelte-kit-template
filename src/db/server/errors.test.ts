import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import { DrizzleQueryError } from 'drizzle-orm';
import { test } from 'vite-plus/test';

// BLOCKED Remove patches/drizzle-orm@*.patch
// See https://github.com/drizzle-team/drizzle-orm/issues/5939
test('DrizzleQueryError omits params', () => {
	const error = new DrizzleQueryError('select ?', ['secret'], new Error());
	assert.equal(error.message, 'Failed query: select ?');
	assert.ok(!inspect(error).includes('secret'));
});
