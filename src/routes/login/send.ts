import { object } from 'valibot';
import { PLACEHOLDER_EMAIL } from '#lib/placeholders.ts';
import type { FormAttributes } from '#lib/remote/form.ts';
import { ContactSchema } from './shared.ts';

export const SendCodeSchema = object({
	contact: ContactSchema,
});

export const sendCodeAttributes: FormAttributes<typeof SendCodeSchema> = {
	contact: {
		required: true,
		autocomplete: 'email',
		placeholder: PLACEHOLDER_EMAIL,
	},
};
