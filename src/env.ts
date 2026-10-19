import { dev } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';
import { endsWith, nonEmpty, optional, pipe, string, undefined_ } from 'valibot';

const DatabaseURLSchema = pipe(string(), endsWith('.db'));
const NonEmptyStringSchema = pipe(string(), nonEmpty());

export const variables = defineEnvVars({
	DATABASE_APP_URL: { schema: DatabaseURLSchema },
	DATABASE_AUDIT_URL: { schema: dev ? undefined_() : DatabaseURLSchema }, // must be unset in dev

	SENTRY_DSN: { public: true, schema: optional(NonEmptyStringSchema) },
	SITE_NAME: { public: true, schema: NonEmptyStringSchema },
});
