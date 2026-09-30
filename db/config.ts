import type { Config } from 'drizzle-kit';

const shared = {
	dialect: 'sqlite',
	strict: true,
	verbose: true,
} satisfies Config;

export const app = {
	...shared,
	schema: './src/lib/database/schema.ts',
	out: './drizzle/app',
} satisfies Config;

export const audit = {
	...shared,
	schema: './src/lib/server/database/audit.schema.ts',
	out: './drizzle/audit',
} satisfies Config;
