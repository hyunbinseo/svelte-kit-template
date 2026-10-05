import type { Config } from 'drizzle-kit';

const DB_SHARED_DRIZZLE_CONFIG = {
	dialect: 'sqlite',
	strict: true,
	verbose: true,
} satisfies Config;

export const DB_APP_DRIZZLE_CONFIG = {
	...DB_SHARED_DRIZZLE_CONFIG,
	schema: './src/db/server/schema.ts',
	out: './drizzle/app',
} satisfies Config;

export const DB_AUDIT_DRIZZLE_CONFIG = {
	...DB_SHARED_DRIZZLE_CONFIG,
	schema: './src/db/server/audit.schema.ts',
	out: './drizzle/audit',
} satisfies Config;

export const DB_AUDIT_LOG_SELECT_QUERIES = false;
