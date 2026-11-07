import { expect, test } from 'vite-plus/test';
import { parseReturnTo } from '#lib/auth/return-to.ts';

test.for([
	['/', '/'],
	['/account', '/account'],
	['/a/b?c=1#d', '/a/b?c=1#d'],
	['/a/../b', '/b'],
	['/login-help', '/login-help'],
	['/%2F/example.com', '/%2F/example.com'], // an encoded slash stays in the path
])('accepts %s', ([value, expected]) => {
	expect(parseReturnTo(value)).toBe(expected);
});

test.for([
	null,
	undefined,
	'',
	'account',
	'./account',
	'https://example.com/',
	'//example.com',
	'/\\example.com',
	'\\/example.com',
	'/\t/example.com',
	'/\n/example.com',
	'/login',
	'/login?returnTo=/login',
	'/a/../login',
])('rejects %j', (value) => {
	expect(parseReturnTo(value)).toBeUndefined();
});
