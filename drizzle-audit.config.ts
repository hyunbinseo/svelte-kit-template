/// <reference types="node" />

import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { audit as config } from './db/config.ts';

loadEnvFile(resolve(import.meta.dirname, '.env.production'));

if (!env.DATABASE_AUDIT_URL) throw new Error('DATABASE_AUDIT_URL is not set');

export default defineConfig({ ...config, dbCredentials: { url: env.DATABASE_AUDIT_URL } });
