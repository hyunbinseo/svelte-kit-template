import { object } from 'valibot';
import type { FormAttributes } from '#lib/remote/form.ts';
import { ISODateSchema } from '#lib/valibot.ts';

export const SetupProfileSchema = object({
	birth: ISODateSchema,
});

export const setupProfileAttributes: FormAttributes<typeof SetupProfileSchema> = {
	birth: { required: true },
};
