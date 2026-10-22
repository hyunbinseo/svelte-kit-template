import { defineEnvVars } from '@sveltejs/kit/env';
import { AppEnvSchema, DbEnvSchema } from '#lib/env.ts';

export const variables = defineEnvVars({
	DATA_DIR: {
		public: false,
		schema: DbEnvSchema.entries.DATA_DIR,
		static: false,
	},
	SENTRY_DSN: {
		public: true,
		schema: AppEnvSchema.entries.SENTRY_DSN,
		static: true,
	},
	SITE_NAME: {
		public: true,
		schema: AppEnvSchema.entries.SITE_NAME,
		static: true,
	},
});
