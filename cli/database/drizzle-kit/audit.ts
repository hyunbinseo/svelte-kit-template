import { defineConfig } from 'drizzle-kit';
import { DB_AUDIT_MIGRATIONS_DIR, DB_AUDIT_SCHEMA_FILE } from '#database/config.ts';
import { DRIZZLE_BASE_CONFIG } from './base.ts';

export default defineConfig({
	...DRIZZLE_BASE_CONFIG,
	out: DB_AUDIT_MIGRATIONS_DIR,
	schema: DB_AUDIT_SCHEMA_FILE,
});
