import type { Config } from 'drizzle-kit';

const shared: Config = {
	dialect: 'sqlite',
	strict: true,
	verbose: true,
};

export const app: Config = {
	...shared,
	schema: './src/lib/database/schema.ts',
	out: './drizzle/app',
};

export const audit: Config = {
	...shared,
	schema: './src/lib/server/database/audit.schema.ts',
	out: './drizzle/audit',
};
