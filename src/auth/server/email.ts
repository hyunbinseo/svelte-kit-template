import { dev } from '$app/env';

export const sendLoginCode = async ({ email, otp }: { email: string; otp: string }) => {
	if (dev) console.table({ contact: email, code: otp });

	// TODO Implement actual send logic
	await Promise.resolve();
};
