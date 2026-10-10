import type { Config } from 'drizzle-kit';

export const DRIZZLE_BASE_CONFIG = {
	dialect: 'sqlite',
	strict: true,
	verbose: true,
} satisfies Config;
