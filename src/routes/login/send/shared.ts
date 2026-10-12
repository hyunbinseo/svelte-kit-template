import { object } from 'valibot';
import { EmailSchema } from '#lib/valibot.ts';

export const SendCodeSchema = object({
	contact: EmailSchema,
});

export const toSignInIdentifier = (contact: string) => `sign-in-otp-${contact}`;
