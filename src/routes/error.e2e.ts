import { expect } from '@playwright/test';
import { AUTH_REDIRECT_PARAM } from '#lib/auth/config.ts';
import { test } from '#tests/e2e/fixtures.ts';

test('links to login with the current page on 401', async ({ page }) => {
	const destination = '/onboard?step=1';
	const response = await page.goto(destination);
	expect(response?.status()).toBe(401);

	await page.locator('form[action="/login"]').getByRole('button').click();
	await page.waitForURL((url) => url.pathname === '/login');

	const url = new URL(page.url());
	expect(url.searchParams.get(AUTH_REDIRECT_PARAM)).toBe(destination);
});
