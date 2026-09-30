import { test as base } from '@playwright/test';
import { createAppDb } from '#tests/database/app.ts';
import { DATABASE_URL } from './env.ts';

export const test = base.extend<object, { db: ReturnType<typeof createAppDb> }>({
	db: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			const db = createAppDb(DATABASE_URL);
			await use(db);
			db.$client.close();
		},
		{ scope: 'worker' },
	],
});
