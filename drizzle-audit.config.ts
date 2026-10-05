import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { DB_AUDIT_DRIZZLE_CONFIG as config } from '#database/config.ts';

loadEnvFile(resolve(import.meta.dirname, '.env.production'));

assert(env.DATABASE_AUDIT_URL);

export default defineConfig({ ...config, dbCredentials: { url: env.DATABASE_AUDIT_URL } });
