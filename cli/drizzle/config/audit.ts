import { defineConfig } from 'drizzle-kit';
import { DB_AUDIT_MIGRATIONS_DIR, DB_AUDIT_SCHEMA_FILE } from '#database/config.ts';
import { DRIZZLE_SHARED_CONFIG } from './shared.ts';

export default defineConfig({
	...DRIZZLE_SHARED_CONFIG,
	out: DB_AUDIT_MIGRATIONS_DIR,
	schema: DB_AUDIT_SCHEMA_FILE,
});
