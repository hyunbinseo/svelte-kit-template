import assert from 'node:assert/strict';
import { describe, test } from 'vite-plus/test';
import {
	createSessionSecret,
	hashSessionSecret,
	parseSessionToken,
	toSessionToken,
	verifySessionSecret,
} from './token.ts';

describe('parseSessionToken', () => {
	test('parses a token built by toSessionToken', () => {
		const secret = createSessionSecret();
		assert.deepEqual(parseSessionToken(toSessionToken('id', secret)), { id: 'id', secret });
	});

	test('rejects malformed tokens', () => {
		for (const token of ['', 'id', 'id.', '.secret', 'id.secret.extra']) {
			assert.equal(parseSessionToken(token), undefined);
		}
	});
});

describe('verifySessionSecret', () => {
	test('accepts the matching secret', () => {
		const secret = createSessionSecret();
		assert.equal(verifySessionSecret(secret, hashSessionSecret(secret)), true);
	});

	test('rejects a different secret', () => {
		const hash = hashSessionSecret(createSessionSecret());
		assert.equal(verifySessionSecret(createSessionSecret(), hash), false);
	});
});
