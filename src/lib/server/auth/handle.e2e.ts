import assert from 'node:assert/strict';
import { env } from 'node:process';
import { expect } from '@playwright/test';
import { SignJWT } from 'jose';
import {
	AUTH_COOKIE_NAME,
	AUTH_TOKEN_ALGORITHM,
	AUTH_TOKEN_EXPIRES_IN,
	AUTH_TOKEN_ROTATE_THRESHOLD,
} from '#lib/config.ts';
import { userProfileTable } from '#lib/database/schema.ts';
import { seedToken, seedUser } from '#tests/database/app.ts';
import { test } from '#tests/e2e/fixtures.ts';

test('rotates a near-expiry JWT cookie and keeps the session', async ({ page, context, db }) => {
	const userId = seedUser(db);
	db.insert(userProfileTable).values({ id: userId, birth: '2000-01-01' }).run();

	const expiresAt = Date.now() + AUTH_TOKEN_ROTATE_THRESHOLD / 2;
	const jti = seedToken(db, userId, expiresAt);

	assert(env.JWT_SECRET_NEW);
	const jwt = await new SignJWT({})
		.setProtectedHeader({ alg: AUTH_TOKEN_ALGORITHM })
		.setJti(jti)
		.setSubject(userId)
		.setExpirationTime(Math.floor(expiresAt / 1000))
		.setIssuedAt()
		.sign(new TextEncoder().encode(env.JWT_SECRET_NEW));

	await context.addCookies([
		{
			name: AUTH_COOKIE_NAME,
			value: jwt,
			domain: 'localhost',
			path: '/',
		},
	]);

	const getAuthCookie = async () => {
		const cookies = await context.cookies();
		return cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
	};

	await page.goto('/');
	await expect(page.getByText(userId)).toBeVisible();

	const rotated = await getAuthCookie();
	assert(rotated);
	expect(rotated.value).not.toBe(jwt);

	const minExpiresAt = Date.now() + AUTH_TOKEN_EXPIRES_IN - AUTH_TOKEN_ROTATE_THRESHOLD;
	expect(rotated.expires * 1000).toBeGreaterThan(minExpiresAt);

	await page.reload();
	await expect(page.getByText(userId)).toBeVisible();

	const reloaded = await getAuthCookie();
	assert(reloaded);
	expect(reloaded.value).toBe(rotated.value);
});
