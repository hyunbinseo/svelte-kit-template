import type { FormAttributes } from '#lib/remote/form.ts';
import { isoDate, object, pipe, string } from 'valibot';

export const SetupProfileSchema = object({
	birth: pipe(string(), isoDate()),
});

export const setupProfileAttributes: FormAttributes<typeof SetupProfileSchema> = {
	birth: { required: true },
};
