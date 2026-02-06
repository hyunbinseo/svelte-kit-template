import { PLACEHOLDER_EMAIL } from '$lib/placeholders';
import type { FormAttributes } from '$lib/types';
import { email, object, pipe, string } from 'valibot';

export const PublicSendCodeSchema = object({
	contact: pipe(string(), email()),
});

export const sendCodeAttributes: FormAttributes<typeof PublicSendCodeSchema> = {
	contact: {
		required: true,
		autocomplete: 'email',
		placeholder: PLACEHOLDER_EMAIL,
	},
};
