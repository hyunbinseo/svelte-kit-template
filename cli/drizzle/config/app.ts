import { defineConfig } from 'drizzle-kit';
import { DB_APP_MIGRATIONS_DIR, DB_APP_SCHEMA_FILE } from '#database/config.ts';
import { DRIZZLE_SHARED_CONFIG } from './shared.ts';

export default defineConfig({
	...DRIZZLE_SHARED_CONFIG,
	out: DB_APP_MIGRATIONS_DIR,
	schema: DB_APP_SCHEMA_FILE,
});
