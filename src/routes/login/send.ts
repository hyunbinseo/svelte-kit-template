import { PLACEHOLDER_EMAIL } from '$lib/placeholders';
import type { FormAttributes } from '$lib/types';
import { object } from 'valibot';
import { ContactSchema } from './shared';

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
