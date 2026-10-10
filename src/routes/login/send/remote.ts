import { randomInt, randomUUID } from 'node:crypto';
import { dev } from '$app/env';
import { form, getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { invalid } from '@sveltejs/kit';
import { AUTH_ALLOW_UNREGISTERED, AUTH_CODE_LENGTH } from '#auth/config.ts';
import { requireLoggedOut } from '#auth/server/session.ts';
import { type SendErrorCode, sendErrorCodeToMessage } from './enums.ts';
import { db } from './server.ts';
import { SendCodeSchema } from './shared.ts';

const generateCode = () =>
	randomInt(0, Math.pow(10, AUTH_CODE_LENGTH)).toString().padStart(AUTH_CODE_LENGTH, '0');

export const sendCode = form(SendCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const code = generateCode();
	const ip = getRequestEvent().getClientAddress();

	const result = db.transaction(
		(tx) => {
			const user = tx.findActiveUserByContact(data.contact);
			if (!user && !AUTH_ALLOW_UNREGISTERED) return { errorCode: 'unregistered' };

			const existingLogin = tx.findLatestUnexpiredLogin(data.contact);
			if (existingLogin && !existingLogin.successfulAttempts.length) {
				return { errorCode: 'rateLimited' };
			}

			const login = tx.insertLogin({
				contact: data.contact,
				userId: user?.id ?? null,
				code,
				ip,
			});

			return { login };
		},
		{ behavior: 'immediate' },
	) satisfies { login: unknown } | { errorCode: SendErrorCode };

	if (result.errorCode) invalid(issue.contact(sendErrorCodeToMessage[result.errorCode]));

	if (dev) console.table({ contact: data.contact, code });

	let sendId: string;

	try {
		// TODO Implement actual send logic
		sendId = await Promise.resolve(randomUUID());
	} catch (error) {
		captureException(error);
		db.discardLogin(result.login.id);
		invalid(issue.contact(sendErrorCodeToMessage.sendFailed));
	}

	db.markDelivered({ id: result.login.id, sendId });

	return {
		id: result.login.id,
		contact: data.contact,
	};
});
