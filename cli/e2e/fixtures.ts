import { test as base } from '@playwright/test';
import { DATABASE_URL } from '#cli/e2e/env.ts';
import { createDb } from '#cli/lib/database/app.testing.ts';

export const test = base.extend<object, { db: ReturnType<typeof createDb> }>({
	db: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			const db = createDb(DATABASE_URL);
			await use(db);
			db.$client.close();
		},
		{ scope: 'worker' },
	],
});
