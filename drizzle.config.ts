/// <reference types="node" />

import { defineConfig } from 'drizzle-kit';
import { env } from 'node:process';

// NOTE `drizzle-kit` CLI automatically loads the `.env` file (and others)
// `loadEnvFile` API in this file does not override pre-existing variables

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/database/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: env.DATABASE_URL },
	strict: true,
	verbose: true,
});
