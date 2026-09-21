import { email, isoDate, pipe, string, transform } from 'valibot';
import type { ISODateString } from './types.ts';

export const EmailSchema = pipe(string(), email());

export const ISODateSchema = pipe(
	string(),
	isoDate(),
	transform((v) => v as ISODateString),
);
