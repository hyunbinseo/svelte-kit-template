import { randomInt, randomUUID } from 'node:crypto';
import { dev } from '$app/env';
import { form, getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { invalid } from '@sveltejs/kit';
import { AUTH_ALLOW_UNREGISTERED, AUTH_CODE_LENGTH } from '#auth/config.ts';
import { requireLoggedOut } from '#auth/server/session.ts';
import { db } from '#database/client.ts';
import {
	discardLogin,
	markDelivered,
	findActiveUser,
	findLatestUnexpiredLogin,
	insertLogin,
} from './server.ts';
import { SendCodeSchema, sendErrors } from './shared.ts';

export const sendCode = form(SendCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const result = db.transaction(
		(tx) => {
			const user = findActiveUser(tx, data.contact);
			if (!user && !AUTH_ALLOW_UNREGISTERED) invalid(issue.contact(sendErrors.UNREGISTERED));

			const existingLogin = findLatestUnexpiredLogin(tx, data.contact);
			if (existingLogin && existingLogin.successfulAttempts.length === 0) {
				invalid(issue.contact(sendErrors.RATE_LIMITED));
			}

			const code = randomInt(0, Math.pow(10, AUTH_CODE_LENGTH))
				.toString()
				.padStart(AUTH_CODE_LENGTH, '0');

			const login = insertLogin(tx, {
				contact: data.contact,
				userId: user?.id ?? null,
				code,
				ip: getRequestEvent().getClientAddress(),
			});

			return { login, code };
		},
		{ behavior: 'immediate' },
	);

	if (dev) console.table({ contact: data.contact, code: result.code });

	let sendId: string;
	try {
		// TODO implement actual send logic
		sendId = await Promise.resolve(randomUUID());
	} catch (cause) {
		captureException(cause);
		discardLogin(db, result.login.id);
		invalid(issue.contact(sendErrors.SEND_FAILED));
	}

	markDelivered(db, { loginId: result.login.id, sendId });
	return { id: result.login.id, contact: data.contact };
});
