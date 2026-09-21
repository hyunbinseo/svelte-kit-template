import { object } from 'valibot';
import { PLACEHOLDER_EMAIL } from '#lib/placeholders.ts';
import type { FormAttributes } from '#lib/remote/form.ts';
import { EmailSchema } from '#lib/valibot.ts';

export const SendCodeSchema = object({
	contact: EmailSchema,
});

export const sendCodeAttributes: FormAttributes<typeof SendCodeSchema> = {
	contact: {
		required: true,
		autocomplete: 'email',
		placeholder: PLACEHOLDER_EMAIL,
	},
};
