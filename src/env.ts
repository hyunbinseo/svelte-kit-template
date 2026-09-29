import { dev } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';
import { endsWith, nonEmpty, optional, pipe, string, undefined_ } from 'valibot';

const DatabaseURLSchema = pipe(string(), endsWith('.db'));
const NonEmptyStringSchema = pipe(string(), nonEmpty());

export const variables = defineEnvVars({
	DATABASE_URL: { schema: DatabaseURLSchema },
	DATABASE_AUDIT_URL: { schema: !dev ? DatabaseURLSchema : undefined_() },

	// TODO v3. See https://github.com/sveltejs/kit/pull/16303
	SENTRY_DSN: { public: true, static: true, schema: optional(NonEmptyStringSchema) },
	SITE_NAME: { public: true, static: true, schema: NonEmptyStringSchema },

	// In production, dynamic values can be updated without rebuilding.
	JWT_SECRET_NEW: { static: false, schema: NonEmptyStringSchema },
	JWT_SECRET_OLD: { static: false, schema: optional(NonEmptyStringSchema) },
});
