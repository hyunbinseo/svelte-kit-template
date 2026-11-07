import { describe, expect, test } from 'vite-plus/test';
import {
	createLoginCode,
	createSecret,
	formatToken,
	hashLoginCode,
	hashSessionSecret,
	isSameHash,
	parseToken,
} from '#lib/server/auth/token.ts';

describe('parseToken', () => {
	test('parses a formatted token', () => {
		const secret = createSecret();
		expect(parseToken(formatToken(42, secret))).toEqual({ id: 42, secret });
	});

	const secret = createSecret().toString('base64url');
	test.for([
		undefined,
		'',
		secret,
		`0.${secret}`,
		`01.${secret}`,
		`-1.${secret}`,
		`1.5.${secret}`,
		`99999999999999999.${secret}`, // unsafe integer
		`1.${secret.slice(1)}`,
		`1.${secret}=`,
		`1.${secret.slice(0, -1)}+`,
		`1.${secret} `,
	])('rejects %j', (token) => {
		expect(parseToken(token)).toBeUndefined();
	});

	test('rejects non-canonical base64url', () => {
		// 43 characters carry 258 bits; the last 2 must be zero.
		const zeros = Buffer.alloc(32).toString('base64url');
		expect(zeros.at(-1)).toBe('A');
		expect(parseToken(`1.${zeros.slice(0, -1)}B`)).toBeUndefined();
	});
});

test('hashes are 32 bytes and bind the code to the secret', () => {
	const secret = createSecret();
	expect(hashSessionSecret(secret)).toHaveLength(32);
	expect(hashLoginCode(secret, '123456')).toHaveLength(32);
	expect(isSameHash(hashLoginCode(secret, '123456'), hashLoginCode(secret, '123456'))).toBe(true);
	expect(isSameHash(hashLoginCode(secret, '123456'), hashLoginCode(createSecret(), '123456'))).toBe(
		false,
	);
	expect(isSameHash(hashSessionSecret(secret), Buffer.alloc(16))).toBe(false);
});

test('createLoginCode returns 6 digits', () => {
	for (let i = 0; i < 100; i++) expect(createLoginCode()).toMatch(/^\d{6}$/);
});
