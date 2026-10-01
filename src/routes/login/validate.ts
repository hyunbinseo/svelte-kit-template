import { digits, length, object, pipe, string, uuid } from 'valibot';
import { AUTH_CODE_LENGTH } from '#lib/config.ts';
import { EmailSchema } from '#lib/valibot.ts';

export const ValidateCodeSchema = object({
	id: pipe(string(), uuid()),
	contact: EmailSchema,
	code: pipe(string(), digits(), length(AUTH_CODE_LENGTH)),
});
