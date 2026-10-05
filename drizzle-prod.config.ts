import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { app as config } from './src/lib/server/database/config.ts';

loadEnvFile(resolve(import.meta.dirname, '.env.production'));

assert(env.DATABASE_URL);

export default defineConfig({ ...config, dbCredentials: { url: env.DATABASE_URL } });
