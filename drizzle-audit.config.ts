/// <reference types="node" />

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { audit as config } from './db/config.ts';

loadEnvFile(resolve(import.meta.dirname, '.env.production'));

assert(env.DATABASE_AUDIT_URL);

export default defineConfig({ ...config, dbCredentials: { url: env.DATABASE_AUDIT_URL } });
