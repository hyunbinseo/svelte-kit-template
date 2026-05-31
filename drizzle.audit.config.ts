/// <reference types="node" />

import { defineConfig } from 'drizzle-kit';
import { env } from 'node:process';

// NOTE `drizzle-kit` CLI automatically loads the `.env` file
if (!env.DATABASE_AUDIT_URL) throw new Error('DATABASE_AUDIT_URL is not set');

export default defineConfig({
	schema: './src/lib/server/database/audit.schema.ts',
	out: './drizzle/audit',
	dialect: 'sqlite',
	dbCredentials: { url: env.DATABASE_AUDIT_URL },
	strict: true,
	verbose: true,
});
