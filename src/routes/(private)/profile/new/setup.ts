import type { FormAttributes } from '#lib/remote/form.ts';
import type { ISODateString } from '#lib/types.ts';
import { isoDate, object, pipe, string, transform } from 'valibot';

export const SetupProfileSchema = object({
	birth: pipe(
		string(),
		isoDate(),
		transform((v) => v as ISODateString),
	),
});

export const setupProfileAttributes: FormAttributes<typeof SetupProfileSchema> = {
	birth: { required: true },
};
