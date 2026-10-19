import assert from 'node:assert/strict';
import { type BrowserContext, expect } from '@playwright/test';
import {
	AUTH_COOKIE_NAME,
	AUTH_SESSION_EXPIRES_IN,
	AUTH_SESSION_REFRESH_THRESHOLD,
} from '#auth/config.ts';
import { deactivateUser } from '#database/app/procedures.ts';
import { MINUTE } from '#lib/time.ts';
import { seedUser, seedUserSession } from '#tests/database/app.ts';
import { test } from '#tests/e2e/fixtures.ts';

const addSessionCookie = async (context: BrowserContext, token: string) => {
	await context.addCookies([
		{ name: AUTH_COOKIE_NAME, value: token, domain: 'localhost', path: '/' },
	]);
};

const findSessionCookie = async (context: BrowserContext) => {
	const cookies = await context.cookies();
	return cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
};

test('keeps a valid session', async ({ page, context, db }) => {
	const session = seedUserSession(db, seedUser(db).id, Date.now() + AUTH_SESSION_EXPIRES_IN);
	await addSessionCookie(context, session.token);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(303);

	expect((await findSessionCookie(context))?.value).toBe(session.token);
});

test('refreshes a session within the refresh threshold', async ({ page, context, db }) => {
	const expiresAt = Date.now() + AUTH_SESSION_REFRESH_THRESHOLD - MINUTE;
	const session = seedUserSession(db, seedUser(db).id, expiresAt);
	await addSessionCookie(context, session.token);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(303);

	const refreshed = db.query.userSessionTable.findFirst({ where: { id: session.id } }).sync();
	assert(refreshed);
	expect(refreshed.expiresAt.getTime()).toBeGreaterThan(expiresAt);

	const cookie = await findSessionCookie(context);
	assert(cookie);
	expect(cookie.value).toBe(session.token);
	expect(cookie.expires * 1000).toBeGreaterThan(expiresAt);
});

test('drops a session with a wrong secret', async ({ page, context, db }) => {
	const session = seedUserSession(db, seedUser(db).id, Date.now() + AUTH_SESSION_EXPIRES_IN);
	await addSessionCookie(context, `${session.id}.wrong-secret`);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(200);

	expect(await findSessionCookie(context)).toBeUndefined();
});

test('drops an expired session', async ({ page, context, db }) => {
	const session = seedUserSession(db, seedUser(db).id, Date.now() - 1);
	await addSessionCookie(context, session.token);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(200);

	expect(await findSessionCookie(context)).toBeUndefined();
});

test('drops a session of a deactivated user', async ({ page, context, db }) => {
	const adminId = seedUser(db).id;
	const userId = seedUser(db).id;
	const session = seedUserSession(db, userId, Date.now() + AUTH_SESSION_EXPIRES_IN);
	await addSessionCookie(context, session.token);

	deactivateUser(db, userId, { deactivatedBy: adminId });

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(200);

	expect(await findSessionCookie(context)).toBeUndefined();
});

test('revokes the session on logout', async ({ page, context, db }) => {
	const session = seedUserSession(db, seedUser(db).id, Date.now() + AUTH_SESSION_EXPIRES_IN);
	await addSessionCookie(context, session.token);

	const response = await page.request.post('/api/clear-site-data', { maxRedirects: 0 });
	expect(response.status()).toBe(303);

	const revoked = db.query.userSessionTable.findFirst({ where: { id: session.id } }).sync();
	expect(revoked?.revokeReason).toBe('logout');
});
