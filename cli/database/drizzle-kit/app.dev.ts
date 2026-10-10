import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { root } from '#cli/lib/utilities.ts';
import config from './app.ts';

loadEnvFile(resolve(root, '.env.development'));

assert(env.DATABASE_APP_URL);

export default defineConfig({
	...config,
	dbCredentials: { url: env.DATABASE_APP_URL },
});
