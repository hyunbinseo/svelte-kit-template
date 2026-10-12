import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import { test } from '#tests/e2e/fixtures.ts';
import { toSignInIdentifier } from './send/shared.ts';

test('logs in with the emailed code', async ({ page, db }) => {
	const contact = `${randomUUID()}@example.com`;

	await page.goto('/login');
	await page.locator('input[autocomplete="email"]').fill(contact);
	await page.locator('form').getByRole('button').click();

	const codeInput = page.locator('input[autocomplete="one-time-code"]');
	await expect(codeInput).toBeVisible();

	const verification = db.query.verificationTable
		.findFirst({ where: { identifier: toSignInIdentifier(contact) } })
		.sync();
	assert(verification);
	const [code] = verification.value.split(':');
	assert(code);

	await codeInput.fill(code);
	await page.locator('form').getByRole('button').click();

	await expect(page).toHaveURL('/onboard');

	const user = db.query.userTable.findFirst({ where: { contact } }).sync();
	assert(user);
	const sessions = db.query.userSessionTable.findMany({ where: { userId: user.id } }).sync();
	expect(sessions).toHaveLength(1);
});
