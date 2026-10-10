import { timingSafeEqual } from 'node:crypto';
import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { check, fallback, parse, pipe } from 'valibot';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import {
	AUTH_ALLOW_UNREGISTERED,
	AUTH_CODE_MAX_ATTEMPTS,
	AUTH_REDIRECT_PARAM,
} from '#auth/config.ts';
import { requireLoggedOut } from '#auth/server/session.ts';
import { signToken, toIssuedToken } from '#auth/server/token.ts';
import { InternalAbsolutePathSchema } from '#lib/valibot.ts';
import { type ValidateErrorCode, validateErrorCodeToMessage } from './enums.ts';
import { db } from './server.ts';
import { ValidateCodeSchema } from './shared.ts';

const getRedirectDestination = () => {
	const { url } = getRequestEvent();

	return parse(
		fallback(
			pipe(
				InternalAbsolutePathSchema,
				check((v) => new URL(v, url).pathname !== resolve('login')),
			),
			AUTH_LOGIN_REDIRECT,
		),
		url.searchParams.get(AUTH_REDIRECT_PARAM),
	);
};

export const validateCode = form(ValidateCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const ip = getRequestEvent().getClientAddress();

	const result = db.transaction(
		(tx) => {
			const login = tx.findLogin({ id: data.id, contact: data.contact });

			if (!login) error(400);

			if (login.expiresAt < new Date()) return { errorCode: 'codeExpired' };
			if (login.attempts.some((attempt) => attempt.isSuccessful)) return { errorCode: 'codeUsed' };

			if (login.ip !== ip) return { errorCode: 'ipMismatch' };
			if (login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS) return { errorCode: 'codeExhausted' };

			const isCorrect = timingSafeEqual(
				Buffer.from(login.code), //
				Buffer.from(data.code),
			);

			tx.recordAttempt({ loginId: data.id, isSuccessful: isCorrect, ip });

			if (!isCorrect) {
				const isLastAttempt = login.attempts.length + 1 >= AUTH_CODE_MAX_ATTEMPTS;
				return { errorCode: isLastAttempt ? 'codeExhausted' : 'codeInvalid' };
			}

			let user = login.activeUserByContact;

			if (login.userId && login.userId !== user?.id) return { errorCode: 'userDeactivated' };

			if (!user) {
				if (!AUTH_ALLOW_UNREGISTERED) error(403);

				const newUser = tx.insertUser(data.contact);
				user = tx.findActiveUserById(newUser.id) ?? null;

				if (!user) error(500);
			}

			if (!login.userId) tx.linkUser({ id: data.id, userId: user.id });

			const token = tx.insertToken({ userId: user.id, ip });

			return { token: toIssuedToken(token, user) };
		},
		{ behavior: 'immediate' },
	) satisfies { token: unknown } | { errorCode: ValidateErrorCode };

	if (result.errorCode === 'codeInvalid') {
		invalid(issue.code(validateErrorCodeToMessage[result.errorCode]));
	}

	if (result.errorCode) return result;

	await signToken(result.token);

	redirect(303, getRedirectDestination());
});
