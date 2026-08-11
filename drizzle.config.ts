/// <reference types="node" />

import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { app as config } from './db/config.ts';

loadEnvFile(resolve(import.meta.dirname, '.env.development'));

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({ ...config, dbCredentials: { url: env.DATABASE_URL } });
