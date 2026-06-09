/// <reference types="node" />

import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { appConfig } from './drizzle.ts';

loadEnvFile(resolve(import.meta.dirname, '.env.production'));

if (!env.DATABASE_AUDIT_URL) throw new Error('DATABASE_AUDIT_URL is not set');

export default defineConfig({
	...appConfig,
	schema: './src/lib/server/database/audit.schema.ts',
	out: './drizzle/audit',
	dbCredentials: { url: env.DATABASE_AUDIT_URL },
});
