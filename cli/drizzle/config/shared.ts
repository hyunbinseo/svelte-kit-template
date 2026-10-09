import type { Config } from 'drizzle-kit';

export const DRIZZLE_SHARED_CONFIG = {
	dialect: 'sqlite',
	strict: true,
	verbose: true,
} satisfies Config;
