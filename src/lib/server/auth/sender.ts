import { parse } from 'valibot';
import { ModeSchema } from '#lib/env.ts';

// Returns the provider's message ID, if any, stored as login.send_id.
export type LoginCodeSender = (message: { code: string; contact: string }) => Promise<{
	sendId?: string;
}>;

const mode = parse(ModeSchema, import.meta.env.MODE);

// TODO Send with an email provider in production
export const sendLoginCode: LoginCodeSender = async ({ code, contact }) => {
	if (mode === 'production') throw new Error('No login code sender configured');
	console.info(`Login code for ${contact}: ${code}`);
	return {};
};
