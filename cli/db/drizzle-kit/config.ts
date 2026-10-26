import { equal, ok } from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cwd, env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { parse } from 'valibot';
import { ROOT } from '#cli/shared.ts';
import { type DatabaseName, isAuditEnabled, prepareDatabaseFile } from '#db/server/shared.ts';
import { DbEnvSchema, ModeSchema } from '#lib/env.ts';

export const defineDatabaseConfig = (database: DatabaseName) => {
	equal(cwd(), ROOT);

	const mode = parse(ModeSchema, env.MODE);
	if (database === 'audit') ok(isAuditEnabled(mode));

	for (const file of [
		// Match Vite
		`.env.${mode}.local`,
		`.env.${mode}`,
		'.env.local',
		'.env',
	]) {
		if (existsSync(file)) loadEnvFile(file);
	}

	const dataDir = parse(DbEnvSchema.entries.DATA_DIR, env.DATA_DIR);
	const url = prepareDatabaseFile(dataDir, mode, database);

	return defineConfig({
		dbCredentials: { url },
		dialect: 'sqlite',
		out: `./drizzle/${database}`,
		schema: `./src/db/server/${database}/schema.ts`,
		verbose: true,
	});
};
