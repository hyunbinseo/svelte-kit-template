import { CODE_LENGTH } from '$lib/config';
import type { FormAttributes } from '$lib/types';
import { digits, email, length, object, pipe, string, ulid } from 'valibot';

export const PublicValidateCodeSchema = object({
	id: pipe(string(), ulid()),
	contact: pipe(string(), email()),
	code: pipe(string(), digits(), length(CODE_LENGTH)),
});

export const validateCodeAttributes: FormAttributes<typeof PublicValidateCodeSchema> = {
	id: {},
	contact: {},
	code: {
		required: true,
		autocomplete: 'one-time-code',
		placeholder: '0'.repeat(CODE_LENGTH),
		inputmode: 'numeric',

		// FIXME HTML constraint validation does not work
		// See https://github.com/sveltejs/kit/issues/15270
		minlength: CODE_LENGTH,
		maxlength: CODE_LENGTH,
	},
};
