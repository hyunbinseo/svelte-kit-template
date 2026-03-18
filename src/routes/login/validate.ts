import { AUTH_CODE_LENGTH } from '#lib/config.ts';
import type { FormAttributes } from '#lib/types.ts';
import { digits, length, object, pipe, string, ulid } from 'valibot';
import { ContactSchema } from './shared.ts';

export const PublicValidateCodeSchema = object({
	id: pipe(string(), ulid()),
	contact: ContactSchema,
	code: pipe(string(), digits(), length(AUTH_CODE_LENGTH)),
});

export const validateCodeAttributes: FormAttributes<typeof PublicValidateCodeSchema> = {
	id: {},
	contact: {},
	code: {
		required: true,
		autocomplete: 'one-time-code',
		placeholder: '0'.repeat(AUTH_CODE_LENGTH),
		inputmode: 'numeric',

		// FIXME HTML constraint validation does not work
		// See https://github.com/sveltejs/kit/issues/15270
		minlength: AUTH_CODE_LENGTH,
		maxlength: AUTH_CODE_LENGTH,
	},
};
