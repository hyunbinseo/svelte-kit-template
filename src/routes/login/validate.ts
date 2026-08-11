import { digits, length, object, pipe, string, uuid } from 'valibot';
import { AUTH_CODE_LENGTH } from '#lib/config.ts';
import type { FormAttributes } from '#lib/remote/form.ts';
import { ContactSchema } from './shared.ts';

export const ValidateCodeSchema = object({
	id: pipe(string(), uuid()),
	contact: ContactSchema,
	code: pipe(string(), digits(), length(AUTH_CODE_LENGTH)),
});

export const validateCodeAttributes: FormAttributes<typeof ValidateCodeSchema> = {
	id: {},
	contact: {},
	code: {
		required: true,
		autocomplete: 'one-time-code',
		placeholder: '0'.repeat(AUTH_CODE_LENGTH),
		inputmode: 'numeric',

		// BLOCKED HTML constraint validation is not enforced
		// See https://github.com/sveltejs/kit/issues/15270
		minlength: AUTH_CODE_LENGTH,
		maxlength: AUTH_CODE_LENGTH,
	},
};
