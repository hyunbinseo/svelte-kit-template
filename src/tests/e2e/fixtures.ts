import assert from 'node:assert/strict';
import { env } from 'node:process';
// eslint-disable-next-line no-restricted-imports
import { test as base } from '@playwright/test';
import { createAppDb } from '#tests/database/app.ts';

export const test = base.extend<object, { db: ReturnType<typeof createAppDb> }>({
	db: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			assert(env.DATABASE_APP_URL);
			const db = createAppDb(env.DATABASE_APP_URL);

			await use(db);

			db.$client.close();
		},
		{ scope: 'worker' },
	],
});
