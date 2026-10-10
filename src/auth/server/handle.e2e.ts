import assert from 'node:assert/strict';
import { env } from 'node:process';
import { type BrowserContext, expect } from '@playwright/test';
import { decodeJwt, SignJWT } from 'jose';
import {
	AUTH_COOKIE_NAME,
	AUTH_TOKEN_ALGORITHM,
	AUTH_TOKEN_EXPIRES_IN,
	AUTH_TOKEN_ROTATE_GRACE,
	AUTH_TOKEN_ROTATE_THRESHOLD,
} from '#auth/config.ts';
import type { tokenTable } from '#database/app/schema.ts';
import { seedToken, seedTokenBan, seedUser } from '#tests/database/app.ts';
import { test } from '#tests/e2e/fixtures.ts';

assert(env.JWT_SECRET_NEW);
const secret = new TextEncoder().encode(env.JWT_SECRET_NEW);

const addAuthCookie = async (
	context: BrowserContext,
	token: Pick<typeof tokenTable.$inferSelect, 'id' | 'userId' | 'expiresAt'>,
) => {
	const jwt = await new SignJWT({})
		.setProtectedHeader({ alg: AUTH_TOKEN_ALGORITHM })
		.setJti(token.id)
		.setSubject(token.userId)
		.setExpirationTime(token.expiresAt)
		.setIssuedAt()
		.sign(secret);

	await context.addCookies([
		{
			name: AUTH_COOKIE_NAME,
			value: jwt,
			domain: 'localhost',
			path: '/',
		},
	]);

	return jwt;
};

const findAuthCookie = async (context: BrowserContext) => {
	const cookies = await context.cookies();
	return cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
};

test('rotates a near-expiry JWT cookie and keeps the session', async ({ page, context, db }) => {
	const userId = seedUser(db).id;

	const token = seedToken(db, userId, Date.now() + AUTH_TOKEN_ROTATE_THRESHOLD / 2);
	const jwt = await addAuthCookie(context, token);

	const oldCookieResponse = await page.request.get('/login', { maxRedirects: 0 });
	expect(oldCookieResponse.status()).toBe(303);

	const newCookie = await findAuthCookie(context);
	assert(newCookie);
	expect(newCookie.value).not.toBe(jwt);

	const minExpiresAt = Date.now() + AUTH_TOKEN_EXPIRES_IN - AUTH_TOKEN_ROTATE_THRESHOLD;
	expect(newCookie.expires * 1000).toBeGreaterThan(minExpiresAt);

	const newCookieResponse = await page.request.get('/login', { maxRedirects: 0 });
	expect(newCookieResponse.status()).toBe(303);

	const keptCookie = await findAuthCookie(context);
	assert(keptCookie);
	expect(keptCookie.value).toBe(newCookie.value);
});

test('re-signs the rotated token when the rotation response was lost', async ({
	page,
	context,
	db,
}) => {
	const userId = seedUser(db).id;

	const token = seedToken(db, userId, Date.now() + AUTH_TOKEN_ROTATE_THRESHOLD / 2);
	const jwt = await addAuthCookie(context, token);

	await page.request.get('/login', { maxRedirects: 0 });

	const rotated = await findAuthCookie(context);
	assert(rotated);
	expect(rotated.value).not.toBe(jwt);

	// The client never received the rotated cookie.
	await addAuthCookie(context, token);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(303);

	const resigned = await findAuthCookie(context);
	assert(resigned);
	expect(resigned.value).toBe(rotated.value);
	expect(db.query.tokenTable.findMany({ where: { userId } }).sync()).toHaveLength(2);
});

test('re-signs the rotated token for a token far from expiry', async ({ page, context, db }) => {
	const userId = seedUser(db).id;

	const token = seedToken(db, userId, Date.now() + AUTH_TOKEN_EXPIRES_IN);
	const child = seedToken(db, userId, Date.now() + AUTH_TOKEN_EXPIRES_IN, token.id);
	const jwt = await addAuthCookie(context, token);

	seedTokenBan(db, token.id, userId, 'rotate', Date.now() + AUTH_TOKEN_ROTATE_GRACE);

	await page.request.get('/login', { maxRedirects: 0 });

	const cookie = await findAuthCookie(context);
	assert(cookie);
	expect(cookie.value).not.toBe(jwt);
	expect(decodeJwt(cookie.value).jti).toBe(child.id);
});

test('proceeds logged out without re-rotating a rotated stale JWT', async ({
	page,
	context,
	db,
}) => {
	const userId = seedUser(db).id;

	const token = seedToken(db, userId, Date.now() + AUTH_TOKEN_EXPIRES_IN);
	const jwt = await addAuthCookie(context, token);

	seedTokenBan(db, token.id, userId, 'rotate', token.expiresAt.getTime());
	seedTokenBan(db, token.id, userId, 'stale', token.expiresAt.getTime());

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(200);

	const cookie = await findAuthCookie(context);
	expect(cookie?.value).toBe(jwt);
});
