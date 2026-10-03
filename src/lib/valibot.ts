import { check, email, isoDate, pipe, startsWith, string, transform } from 'valibot';
import type { ISODateString } from './types.ts';

const EXAMPLE_ORIGIN = 'https://example.com';

export const EmailSchema = pipe(string(), email());

export const ISODateSchema = pipe(
	string(),
	isoDate(),
	transform((v) => v as ISODateString),
);

export const InternalAbsolutePathSchema = pipe(
	string(),
	startsWith('/'),
	check((v) => URL.canParse(v, EXAMPLE_ORIGIN)),
	transform((v) => new URL(v, EXAMPLE_ORIGIN)),
	check((url) => url.origin === EXAMPLE_ORIGIN),
	transform((url) => url.pathname + url.search + url.hash),
);
