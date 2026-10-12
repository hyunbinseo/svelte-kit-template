import { digits, length, object, pipe, string } from 'valibot';
import { AUTH_CODE_LENGTH } from '#auth/config.ts';
import { EmailSchema } from '#lib/valibot.ts';

export const ValidateCodeSchema = object({
	contact: EmailSchema,
	code: pipe(string(), digits(), length(AUTH_CODE_LENGTH)),
});
