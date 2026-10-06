import assert from 'node:assert/strict';
import { test } from 'vite-plus/test';
import { AUTH_CODE_MAX_ATTEMPTS, AUTH_TOKEN_ROTATE_THRESHOLD } from '#lib/auth/config.ts';
import { Login, Token } from './auth.ts';

const now = new Date('2026-10-06T00:00:00Z');
const login = { ip: '1.1.1.1', expiresAt: new Date('2026-10-06T00:03:00Z'), attempts: [] };

const failureCode = (result: ReturnType<typeof Login.checkAttempt>) =>
	result.isErr() ? result.error.code : undefined;

test('Login.checkAttempt - 새로 발급된 인증번호는 시도할 수 있다', () => {
	assert(Login.checkAttempt(login, '1.1.1.1', now).isOk());
});

test('Login.checkAttempt - 발급과 다른 IP면 막는다', () => {
	assert.equal(failureCode(Login.checkAttempt(login, '2.2.2.2', now)), 'IP_MISMATCH');
});

test('Login.checkAttempt - 만료된 인증번호는 막는다', () => {
	const later = new Date('2026-10-06T00:03:01Z');
	assert.equal(failureCode(Login.checkAttempt(login, '1.1.1.1', later)), 'CODE_EXPIRED');
});

test('Login.checkAttempt - 최대 시도 횟수를 넘으면 막는다', () => {
	const attempts = Array.from({ length: AUTH_CODE_MAX_ATTEMPTS }, () => ({ isSuccessful: false }));
	assert.equal(
		failureCode(Login.checkAttempt({ ...login, attempts }, '1.1.1.1', now)),
		'CODE_BLOCKED',
	);
});

test('Login.checkAttempt - 이미 성공한 인증번호는 막는다', () => {
	const attempts = [{ isSuccessful: true }];
	assert.equal(
		failureCode(Login.checkAttempt({ ...login, attempts }, '1.1.1.1', now)),
		'CODE_BLOCKED',
	);
});

const exp = (ms: number) => Math.floor((now.getTime() + ms) / 1000);
const far = exp(AUTH_TOKEN_ROTATE_THRESHOLD * 2);
const near = exp(AUTH_TOKEN_ROTATE_THRESHOLD / 2);

test('Token.check - 만료가 멀면 그대로 쓴다', () => {
	assert.equal(Token.check({ exp: far, ban: undefined }, now), 'valid');
});

test('Token.check - 만료가 가까우면 회전한다', () => {
	assert.equal(Token.check({ exp: near, ban: undefined }, now), 'rotate');
});

test('Token.check - 밴이 발효되면 거부한다', () => {
	const ban = { reason: 'logout' as const, effectiveAt: now };
	assert.equal(Token.check({ exp: far, ban }, now), 'revoked');
});

test('Token.check - 다른 요청이 회전한 토큰은 유예 기간 동안 그대로 쓴다', () => {
	const ban = { reason: 'rotate' as const, effectiveAt: new Date(now.getTime() + 1) };
	assert.equal(Token.check({ exp: near, ban }, now), 'valid');
});

test('Token.check - stale 밴이면 재발급한다', () => {
	const ban = { reason: 'stale' as const, effectiveAt: new Date(now.getTime() + 1) };
	assert.equal(Token.check({ exp: far, ban }, now), 'stale');
});
