import { check, email, isoDate, pipe, startsWith, string, transform } from 'valibot';

export const EmailSchema = pipe(string(), email());

// Valibot's `isoDate` action output is plain string.
// See https://github.com/open-circle/valibot/issues/945
export type ISODateString = `${number}-${number}-${number}`;

export const ISODateSchema = pipe(
	string(),
	isoDate(),
	transform((v) => v as ISODateString),
);

const EXAMPLE_ORIGIN = 'https://example.com';

export const InternalAbsolutePathSchema = pipe(
	string(),
	startsWith('/'),
	check((v) => URL.canParse(v, EXAMPLE_ORIGIN)),
	transform((v) => new URL(v, EXAMPLE_ORIGIN)),
	check((url) => url.origin === EXAMPLE_ORIGIN),
	transform((url) => url.pathname + url.search + url.hash),
);
