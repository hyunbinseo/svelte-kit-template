import type { Config } from 'drizzle-kit';

export const appConfig = {
	schema: './src/lib/database/schema.ts',
	out: './drizzle/app',
	dialect: 'sqlite',
	strict: true,
	verbose: true,
} as const satisfies Config;
