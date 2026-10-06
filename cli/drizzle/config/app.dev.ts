import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { root } from '#cli/lib/utilities.ts';
import { DB_APP_DRIZZLE_CONFIG } from '#database/config.ts';

loadEnvFile(resolve(root, '.env.development'));

assert(env.DATABASE_URL);

export default defineConfig({
	...DB_APP_DRIZZLE_CONFIG,
	dbCredentials: { url: env.DATABASE_URL },
});
