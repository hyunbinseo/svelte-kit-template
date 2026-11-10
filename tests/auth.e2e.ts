import type { BrowserContext } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { loginAttemptTable, loginTable, userSessionTable } from '#db/app/schema.ts';
import { createTestContact, seedPendingLogin, seedUser, seedUserSession } from '#db/app/testing.ts';
import { closeUser } from '#db/app/user/procedures.ts';
import { SESSION_LIFETIME_MS } from '#lib/auth/config.ts';
import { createSecret, formatToken } from '#lib/server/auth/token.ts';
import { expect, test } from '#tests/fixtures.ts';

const DAY = 24 * 60 * 60 * 1000;

const setCookie = (context: BrowserContext, name: string, value: string) =>
	context.addCookies([{ name, url: 'http://localhost:6526', value }]);

const getCookie = async (context: BrowserContext, name: string) =>
	(await context.cookies()).find((cookie) => cookie.name === name);

test.describe('session', () => {
	test('keeps a valid session', async ({ context, db, page }) => {
		const { contact, userId } = seedUser(db);
		const { token } = seedUserSession(db, { userId });
		await setCookie(context, 'session', token);

		await page.goto('/account');
		await expect(page.getByRole('banner').getByText(contact)).toBeVisible();
		expect((await getCookie(context, 'session'))?.value).toBe(token);
	});

	test('refreshes a session with less than 15 days left', async ({ context, db, page }) => {
		const { userId } = seedUser(db);
		const { token, userSessionId } = seedUserSession(db, {
			expiresAt: new Date(Date.now() + 10 * DAY),
			userId,
		});
		await setCookie(context, 'session', token);

		const requestedAt = Date.now();
		await page.goto('/account');

		const session = db
			.select()
			.from(userSessionTable)
			.where(eq(userSessionTable.id, userSessionId))
			.get();
		expect(session?.expiresAt.getTime()).toBeGreaterThanOrEqual(requestedAt + SESSION_LIFETIME_MS);
		const cookie = await getCookie(context, 'session');
		expect(cookie?.value).toBe(token);
		expect(cookie?.expires).toBeGreaterThan((requestedAt + 29 * DAY) / 1000);
	});

	test('deletes a cookie with a wrong secret', async ({ context, db, page }) => {
		const { userId } = seedUser(db);
		const { userSessionId } = seedUserSession(db, { userId });
		await setCookie(context, 'session', formatToken(userSessionId, createSecret()));

		expect((await page.goto('/account'))?.status()).toBe(401);
		expect(await getCookie(context, 'session')).toBeUndefined();
	});

	test('deletes a malformed cookie', async ({ context, page }) => {
		await setCookie(context, 'session', 'malformed');

		expect((await page.goto('/account'))?.status()).toBe(401);
		expect(await getCookie(context, 'session')).toBeUndefined();
	});

	test('deletes an expired cookie', async ({ context, db, page }) => {
		const { userId } = seedUser(db);
		const { token } = seedUserSession(db, { expiresAt: new Date(), userId });
		await setCookie(context, 'session', token);

		expect((await page.goto('/account'))?.status()).toBe(401);
		expect(await getCookie(context, 'session')).toBeUndefined();
	});

	test('rejects a closed user on the next request', async ({ context, db, page }) => {
		const { contact, userId } = seedUser(db);
		const { token } = seedUserSession(db, { userId });
		await setCookie(context, 'session', token);
		await page.goto('/account');
		await expect(page.getByRole('banner').getByText(contact)).toBeVisible();

		closeUser(db, { closedBy: userId, closedReason: 'user_requested', userId });

		expect((await page.reload())?.status()).toBe(401);
		expect(await getCookie(context, 'session')).toBeUndefined();
	});

	test('logs out', async ({ context, db, page }) => {
		const { contact, userId } = seedUser(db);
		const { token, userSessionId } = seedUserSession(db, { userId });
		await setCookie(context, 'session', token);
		await page.goto('/account');
		await expect(page.getByRole('banner').getByText(contact)).toBeVisible();

		await page.getByRole('button', { name: '로그아웃' }).click();
		await expect(page).toHaveURL('/');

		expect(
			db.select().from(userSessionTable).where(eq(userSessionTable.id, userSessionId)).get(),
		).toMatchObject({ revokedBy: userId, revokedReason: 'user_logged_out' });
		expect(await getCookie(context, 'session')).toBeUndefined();
	});

	test('clears site data', async ({ context, db, page }) => {
		const { userId } = seedUser(db);
		const { token, userSessionId } = seedUserSession(db, { userId });
		await setCookie(context, 'session', token);

		const response = await page.request.post('/clear-site-data', {
			headers: { origin: 'http://localhost:6526' }, // passes SvelteKit's CSRF check
			maxRedirects: 0,
		});
		expect(response.status()).toBe(303);
		expect(response.headers()['clear-site-data']).toBe('"cache", "cookies", "storage"');
		expect(
			db.select().from(userSessionTable).where(eq(userSessionTable.id, userSessionId)).get(),
		).toMatchObject({ revokedReason: 'user_logged_out' });
	});
});

test.describe('login', () => {
	const codeForm = 'form:has(input[name^="code/"])';

	test('401 → login → returnTo', async ({ context, db, page }) => {
		const { contact, userId } = seedUser(db);

		expect((await page.goto('/account?a=1'))?.status()).toBe(401);
		await page.locator('a[href^="/login?"]').click();
		await expect(page).toHaveURL('/login?returnTo=%2Faccount%3Fa%3D1');

		const { code, token } = seedPendingLogin(db, { contact, userId });
		await setCookie(context, 'login', token);
		await page.reload();

		await page.locator(`${codeForm} input[name^="code/"]`).fill(code);
		await page.locator(codeForm).getByRole('button').click();

		await expect(page).toHaveURL('/account?a=1');
		await expect(page.getByRole('banner').getByText(contact)).toBeVisible();
		expect(await getCookie(context, 'login')).toBeUndefined();
	});

	test('signs up a new contact, then onboards', async ({ context, db, page }) => {
		const contact = createTestContact();
		const { code, token } = seedPendingLogin(db, { contact });
		await setCookie(context, 'login', token);

		await page.goto('/login?returnTo=%2Faccount');
		await page.locator(`${codeForm} input[name^="code/"]`).fill(code);
		await page.locator(codeForm).getByRole('button').click();
		await expect(page).toHaveURL('/onboarding?returnTo=%2Faccount');

		await page.locator('input[name^="birthDate/"]').fill('2000-01-01');
		await page.locator('main form').getByRole('button').click();

		await expect(page).toHaveURL('/account');
		await expect(page.getByRole('banner').getByText(contact)).toBeVisible();
	});

	test('sends a code bound to the browser, with 2 attempts', async ({ context, db, page }) => {
		const contact = createTestContact();
		const contactInput = page.locator('input[name^="contact/"]');
		const codeInput = page.locator(`${codeForm} input[name^="code/"]`);

		const requestCode = async () => {
			await contactInput.fill(contact); // reset after each success
			await page.locator('form:has(input[name^="contact/"])').getByRole('button').click();
		};
		const getLogins = () =>
			db.select().from(loginTable).where(eq(loginTable.contact, contact)).all();

		await page.goto('/login');
		await requestCode();
		await expect(codeInput).toBeVisible();
		const [login] = getLogins();
		expect((await getCookie(context, 'login'))?.value).toMatch(new RegExp(`^${login?.id}\\.`));

		// One pending code per contact
		await requestCode();
		await expect(contactInput).toHaveAttribute('aria-invalid', 'true');
		expect(getLogins()).toHaveLength(1);

		const getAttempts = () =>
			db
				.select()
				.from(loginAttemptTable)
				.where(eq(loginAttemptTable.loginId, login?.id ?? 0))
				.all();

		// The code is only printed to the server console, so these are wrong.
		for (const [index, code] of ['000000', '000001'].entries()) {
			await codeInput.fill(code);
			await page.locator(codeForm).getByRole('button').click();
			await expect.poll(() => getAttempts().length).toBe(index + 1);
		}
		await expect(codeInput).toHaveAttribute('aria-invalid', 'true');

		// Out of attempts, so a new code can be requested.
		await requestCode();
		await expect.poll(() => getLogins().length).toBe(2);
	});
});
