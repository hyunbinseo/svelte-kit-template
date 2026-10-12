import { form } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { invalid } from '@sveltejs/kit';
import { AUTH_ALLOW_UNREGISTERED } from '#auth/config.ts';
import { auth } from '#auth/server/auth.ts';
import { sendLoginCode } from '#auth/server/email.ts';
import { requireLoggedOut } from '#auth/server/session.ts';
import { type SendErrorCode, sendErrorCodeToMessage } from './enums.ts';
import { db } from './server.ts';
import { SendCodeSchema, toSignInIdentifier } from './shared.ts';

export const sendCode = form(SendCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const identifier = toSignInIdentifier(data.contact);

	const errorCode = db.transaction(
		(tx) => {
			const user = tx.findUserByContact(data.contact);
			if (!user && !AUTH_ALLOW_UNREGISTERED) return 'unregistered';

			const verification = tx.findVerificationByIdentifier(identifier);
			if (verification && verification.expiresAt >= new Date()) return 'rateLimited';
			if (verification) tx.discardVerification(identifier);

			return undefined;
		},
		{ behavior: 'immediate' },
	) satisfies SendErrorCode | undefined;

	if (errorCode) invalid(issue.contact(sendErrorCodeToMessage[errorCode]));

	const otp = await auth.api.createVerificationOTP({
		body: { email: data.contact, type: 'sign-in' },
	});

	try {
		await sendLoginCode({ email: data.contact, otp });
	} catch (error) {
		captureException(error);
		db.discardVerification(identifier);
		invalid(issue.contact(sendErrorCodeToMessage.sendFailed));
	}

	return { contact: data.contact };
});
