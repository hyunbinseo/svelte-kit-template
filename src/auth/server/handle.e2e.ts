import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { env } from 'node:process';
import { type BrowserContext, expect } from '@playwright/test';
import {
	AUTH_COOKIE_NAME,
	AUTH_SESSION_EXPIRES_IN,
	AUTH_SESSION_UPDATE_AGE,
} from '#auth/config.ts';
import { deactivateUser } from '#database/app/procedures.ts';
import { userSessionTable } from '#database/app/schema.ts';
import type { AppSelect } from '#database/app/types.ts';
import { MINUTE } from '#lib/time.ts';
import { seedSession, seedUser } from '#tests/database/app.ts';
import { test } from '#tests/e2e/fixtures.ts';

assert(env.AUTH_SECRET);
const secret = env.AUTH_SECRET;

const addSessionCookie = async (
	context: BrowserContext,
	session: AppSelect<'userSessionTable', 'token'>,
	sign = (token: string) => createHmac('sha256', secret).update(token).digest('base64'),
) => {
	const value = encodeURIComponent(`${session.token}.${sign(session.token)}`);
	await context.addCookies([{ name: AUTH_COOKIE_NAME, value, domain: 'localhost', path: '/' }]);
	return value;
};

const findSessionCookie = async (context: BrowserContext) => {
	const cookies = await context.cookies();
	return cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
};

test('keeps a valid session', async ({ page, context, db }) => {
	const session = seedSession(db, seedUser(db).id, Date.now() + AUTH_SESSION_EXPIRES_IN);
	const value = await addSessionCookie(context, session);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(303);

	expect((await findSessionCookie(context))?.value).toBe(value);
});

test('drops a session with an invalid signature', async ({ page, context, db }) => {
	const session = seedSession(db, seedUser(db).id, Date.now() + AUTH_SESSION_EXPIRES_IN);
	await addSessionCookie(context, session, (token) =>
		createHmac('sha256', 'wrong-secret').update(token).digest('base64'),
	);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(200);

	expect(await findSessionCookie(context)).toBeUndefined();
});

test('drops an expired session', async ({ page, context, db }) => {
	const session = seedSession(db, seedUser(db).id, Date.now() - 1);
	await addSessionCookie(context, session);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(200);

	expect(await findSessionCookie(context)).toBeUndefined();
});

test('drops a session of a deactivated user', async ({ page, context, db }) => {
	const adminId = seedUser(db).id;
	const userId = seedUser(db).id;
	const session = seedSession(db, userId, Date.now() + AUTH_SESSION_EXPIRES_IN);
	await addSessionCookie(context, session);

	deactivateUser(db, userId, { deactivatedBy: adminId });

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(200);

	expect(await findSessionCookie(context)).toBeUndefined();
});

test('refreshes a session past the update age', async ({ page, context, db }) => {
	const expiresAt = Date.now() + AUTH_SESSION_EXPIRES_IN - AUTH_SESSION_UPDATE_AGE - MINUTE;
	const session = seedSession(db, seedUser(db).id, expiresAt);
	await addSessionCookie(context, session);

	const response = await page.request.get('/login', { maxRedirects: 0 });
	expect(response.status()).toBe(303);

	const refreshed = db.query.userSessionTable.findFirst({ where: { id: session.id } }).sync();
	assert(refreshed);
	expect(refreshed.expiresAt.getTime()).toBeGreaterThan(expiresAt);

	const cookie = await findSessionCookie(context);
	assert(cookie);
	expect(cookie.expires * 1000).toBeGreaterThan(expiresAt);
});

test('deletes the session on logout', async ({ page, context, db }) => {
	const session = seedSession(db, seedUser(db).id, Date.now() + AUTH_SESSION_EXPIRES_IN);
	await addSessionCookie(context, session);

	const response = await page.request.post('/api/clear-site-data', { maxRedirects: 0 });
	expect(response.status()).toBe(303);

	const rows = db.select().from(userSessionTable).all();
	expect(rows.map((row) => row.id)).not.toContain(session.id);
});
