import { object } from 'valibot';
import { ISODateSchema } from '#lib/valibot.ts';

export const SetupProfileSchema = object({
	birth: ISODateSchema,
});
