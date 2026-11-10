import type { BrowserContext } from '@playwright/test';
import { parse } from 'valibot';
import type { AppDb } from '#db/app/drizzle.ts';
import { seedUser, seedUserSession } from '#db/app/testing.ts';
import { AppEnvSchema } from '#lib/env.ts';
import { expect, test } from '#tests/fixtures.ts';

const SITE_NAME = parse(AppEnvSchema.entries.SITE_NAME, process.env.SITE_NAME);

const logIn = async (context: BrowserContext, db: AppDb, isOnboarded = true) => {
	const { userId } = seedUser(db, { isOnboarded });
	const { token } = seedUserSession(db, { userId });
	await context.addCookies([{ name: 'session', url: 'http://localhost:6526', value: token }]);
};

test('sets a title and noindex on every page', async ({ context, db, page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(SITE_NAME);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

	await page.goto('/login');
	await expect(page).toHaveTitle(`로그인 - ${SITE_NAME}`);

	expect((await page.goto('/missing'))?.status()).toBe(404);
	await expect(page).toHaveTitle(`찾을 수 없음 - ${SITE_NAME}`);

	await logIn(context, db, false);
	await page.goto('/onboarding');
	await expect(page).toHaveTitle(`가입 - ${SITE_NAME}`);

	await context.clearCookies();
	await logIn(context, db);
	await page.goto('/account');
	await expect(page).toHaveTitle(`내 계정 - ${SITE_NAME}`);
});

test('shows the login state on the prerendered home page', async ({ context, db, page }) => {
	await page.goto('/');
	await expect(page.locator('main a[href="/login"]')).toBeVisible();

	await logIn(context, db);
	await page.goto('/');
	await expect(page.locator('main a[href="/account"]')).toBeVisible();

	await context.clearCookies();
	await logIn(context, db, false);
	await page.goto('/');
	await page.locator('main a[href="/account"]').click();
	await expect(page).toHaveURL('/onboarding');
});

test('shows a toast while offline', async ({ context, page }) => {
	await page.goto('/login');

	await context.setOffline(true);
	await expect(page.getByRole('status')).toHaveText('오프라인 상태입니다.');

	await context.setOffline(false);
	await expect(page.getByRole('status')).toBeHidden();
});

test('shows a toast for a new version, and navigates with a full load', async ({ page }) => {
	await page.route('**/_app/version.json', (route) => route.fulfill({ json: { version: 'new' } }));
	await page.goto('/');
	await page.evaluate(() => Reflect.set(window, 'isSameDocument', true));

	// SvelteKit checks for a new version when the window regains focus.
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await expect(page.getByRole('status')).toContainText('새 버전이 있습니다.');

	await page.locator('main a[href="/login"]').click();
	await expect(page).toHaveURL('/login');
	expect(await page.evaluate(() => Reflect.get(window, 'isSameDocument'))).toBeUndefined();
});
