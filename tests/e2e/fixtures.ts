import { test as base } from '@playwright/test';
import { createDb } from '#tests/database/app.ts';
import { DATABASE_URL } from './env.ts';

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
