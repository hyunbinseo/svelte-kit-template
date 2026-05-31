/// <reference types="node" />

import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { appConfig } from './drizzle';

loadEnvFile(resolve(import.meta.dirname, '.env.production'));

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({ ...appConfig, dbCredentials: { url: env.DATABASE_URL } });
