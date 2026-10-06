import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { root } from '#cli/lib/utilities.ts';
import { DB_AUDIT_DRIZZLE_CONFIG } from '#database/config.ts';

loadEnvFile(resolve(root, '.env.production'));

assert(env.DATABASE_AUDIT_URL);

export default defineConfig({
	...DB_AUDIT_DRIZZLE_CONFIG,
	dbCredentials: { url: env.DATABASE_AUDIT_URL },
});
