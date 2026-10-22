import {
	digits,
	type InferOutput,
	maxValue,
	minValue,
	nonEmpty,
	object,
	optional,
	picklist,
	pipe,
	string,
	transform,
	trim,
	url,
} from 'valibot';

export const ModeSchema = picklist(['development', 'e2e', 'production']);
export type Mode = InferOutput<typeof ModeSchema>;

export const AppEnvSchema = object({
	SENTRY_DSN: optional(pipe(string(), url())),
	SITE_NAME: pipe(string(), trim(), nonEmpty()),
});

export const DbEnvSchema = object({
	DATA_DIR: optional(pipe(string(), nonEmpty()), 'data'),
});

// See https://svelte.dev/docs/kit/adapter-node#Environment-variables
export const AdapterNodeEnvSchema = object({
	ADDRESS_HEADER: optional(pipe(string(), nonEmpty())),
	HOST: optional(pipe(string(), nonEmpty())),
	PORT: optional(pipe(string(), digits(), transform(Number), minValue(1), maxValue(65535))),
	XFF_DEPTH: optional(pipe(string(), digits(), transform(Number), minValue(1), maxValue(100))),
});
