import { equal, ok } from 'node:assert/strict';
import { cwd, env } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { parse } from 'valibot';
import { loadModeEnv, ROOT } from '#cli/lib/shared.ts';
import { type DatabaseName, isAuditEnabled, prepareDatabasePath } from '#db/shared/database.ts';
import { DbEnvSchema, ModeSchema } from '#lib/env.ts';

export const defineDatabaseConfig = (database: DatabaseName) => {
	equal(cwd(), ROOT);

	const mode = parse(ModeSchema, env.MODE);
	if (database === 'audit') ok(isAuditEnabled(mode));

	loadModeEnv(mode);

	const dataDir = parse(DbEnvSchema.entries.DATA_DIR, env.DATA_DIR);
	const url = prepareDatabasePath(dataDir, mode, database);

	return defineConfig({
		dbCredentials: { url },
		dialect: 'sqlite',
		out: `./drizzle/${database}`,
		schema: `./src/db/server/${database}/schema.ts`,
		verbose: true,
	});
};
