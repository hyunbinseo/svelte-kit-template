import assert from 'node:assert/strict';
import { type BrowserContext, expect } from '@playwright/test';
import { type JWTPayload, SignJWT, UnsecuredJWT } from 'jose';
import {
	AUTH_COOKIE_NAME,
	AUTH_TOKEN_ALGORITHM,
	AUTH_TOKEN_EXPIRES_IN,
	AUTH_TOKEN_ROTATE_THRESHOLD,
} from '#lib/config.ts';
import { userProfileTable } from '#lib/database/schema.ts';
import { seedToken, seedUser } from '#tests/database/app.ts';
import { JWT_SECRET_NEW, JWT_SECRET_OLD } from '#tests/e2e/env.ts';
import { test } from '#tests/e2e/fixtures.ts';

type Db = Parameters<typeof seedUser>[0];

const seedSession = (db: Db, expiresAt: number) => {
	const userId = seedUser(db);
	db.insert(userProfileTable).values({ id: userId, birth: '2000-01-01' }).run();

	const claims: JWTPayload = {
		jti: seedToken(db, userId, expiresAt),
		sub: userId,
		exp: Math.floor(expiresAt / 1000),
		iat: Math.floor(Date.now() / 1000),
	};

	return { userId, claims };
};

const signJWT = (claims: JWTPayload, alg: string = AUTH_TOKEN_ALGORITHM, secret = JWT_SECRET_NEW) =>
	new SignJWT(claims).setProtectedHeader({ alg }).sign(new TextEncoder().encode(secret));

const addAuthCookie = (context: BrowserContext, jwt: string) =>
	context.addCookies([{ name: AUTH_COOKIE_NAME, value: jwt, domain: 'localhost', path: '/' }]);

const getAuthCookie = async (context: BrowserContext) => {
	const cookies = await context.cookies();
	return cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
};

test('rotates a near-expiry JWT cookie and keeps the session', async ({ page, context, db }) => {
	const { userId, claims } = seedSession(db, Date.now() + AUTH_TOKEN_ROTATE_THRESHOLD / 2);
	const jwt = await signJWT(claims);
	await addAuthCookie(context, jwt);

	await page.goto('/');
	await expect(page.getByText(userId)).toBeVisible();

	const rotated = await getAuthCookie(context);
	assert(rotated);
	expect(rotated.value).not.toBe(jwt);

	const minExpiresAt = Date.now() + AUTH_TOKEN_EXPIRES_IN - AUTH_TOKEN_ROTATE_THRESHOLD;
	expect(rotated.expires * 1000).toBeGreaterThan(minExpiresAt);

	await page.reload();
	await expect(page.getByText(userId)).toBeVisible();

	const reloaded = await getAuthCookie(context);
	assert(reloaded);
	expect(reloaded.value).toBe(rotated.value);
});

test('accepts a JWT cookie signed with the old secret', async ({ page, context, db }) => {
	const { userId, claims } = seedSession(db, Date.now() + AUTH_TOKEN_EXPIRES_IN);
	await addAuthCookie(context, await signJWT(claims, AUTH_TOKEN_ALGORITHM, JWT_SECRET_OLD));

	await page.goto('/');
	await expect(page.getByText(userId)).toBeVisible();
});

type InvalidJWT = [name: string, sign: (claims: JWTPayload) => Promise<string> | string];

const invalidJWTs: InvalidJWT[] = [
	['alg: none', (claims) => new UnsecuredJWT(claims).encode()],
	['a disallowed algorithm', (claims) => signJWT(claims, 'HS512')],
	['an unknown secret', (claims) => signJWT(claims, AUTH_TOKEN_ALGORITHM, 'unknown-secret')],
	...(['jti', 'sub', 'exp', 'iat'] as const).map((claim): InvalidJWT => [
		`a missing ${claim}`,
		(claims) => signJWT({ ...claims, [claim]: undefined }),
	]),
	...(['jti', 'sub'] as const).map((claim): InvalidJWT => [
		`a non-string ${claim}`,
		(claims) => signJWT({ ...claims, [claim]: 1 }),
	]),
];

for (const [name, sign] of invalidJWTs) {
	test(`rejects a JWT cookie with ${name}`, async ({ page, context, db }) => {
		const { claims } = seedSession(db, Date.now() + AUTH_TOKEN_EXPIRES_IN);
		await addAuthCookie(context, await sign(claims));

		await page.goto('/');
		await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
		expect(await getAuthCookie(context)).toBeUndefined();
	});
}
