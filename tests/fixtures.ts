import { test as base } from '@playwright/test';
import { parse } from 'valibot';
import { type AppDb, createAppDb } from '#db/app/drizzle.ts';
import { openConnection } from '#db/shared/connection.ts';
import { prepareDatabasePath } from '#db/shared/database.ts';
import { DbEnvSchema } from '#lib/env.ts';

export { expect } from '@playwright/test';

// The server's database, shared by the worker's tests (seed unique values)
export const test = base.extend<object, { db: AppDb }>({
	db: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			const dataDir = parse(DbEnvSchema.entries.DATA_DIR, process.env.DATA_DIR);
			const connection = openConnection(prepareDatabasePath(dataDir, 'e2e', 'app'));
			await use(createAppDb(connection));
			connection.close();
		},
		{ scope: 'worker' },
	],
});
