import { PLACEHOLDER_EMAIL } from '$lib/placeholders.ts';
import type { FormAttributes } from '$lib/types.ts';
import { object } from 'valibot';
import { ContactSchema } from './shared.ts';

export const PublicSendCodeSchema = object({
	contact: ContactSchema,
});

export const sendCodeAttributes: FormAttributes<typeof PublicSendCodeSchema> = {
	contact: {
		required: true,
		autocomplete: 'email',
		placeholder: PLACEHOLDER_EMAIL,
	},
};
