import { timingSafeEqual } from 'node:crypto';
import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { check, fallback, parse, pipe } from 'valibot';
import { LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import {
	AUTH_ALLOW_UNREGISTERED,
	AUTH_CODE_MAX_ATTEMPTS,
	AUTH_REDIRECT_PARAM,
} from '#auth/config.ts';
import { requireLoggedOut } from '#auth/server/session.ts';
import { issueToken } from '#auth/server/token.ts';
import { InternalAbsolutePathSchema } from '#lib/valibot.ts';
import { db } from './server.ts';
import { validateErrors, ValidateCodeSchema, type ValidateErrorCode } from './shared.ts';

const getRedirectDestination = () => {
	const { url } = getRequestEvent();

	return parse(
		fallback(
			pipe(
				InternalAbsolutePathSchema,
				check((v) => new URL(v, url).pathname !== resolve('login')),
			),
			LOGIN_REDIRECT,
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

			if (login.expiresAt < new Date()) return { errorCode: 'CODE_EXPIRED' } as const;
			if (login.attempts.some((attempt) => attempt.isSuccessful)) {
				return { errorCode: 'CODE_USED' } as const;
			}

			if (login.ip !== ip) return { errorCode: 'IP_MISMATCH' } as const;
			if (login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS) {
				return { errorCode: 'CODE_EXHAUSTED' } as const;
			}

			const isCorrect = timingSafeEqual(Buffer.from(login.code), Buffer.from(data.code));
			tx.recordAttempt({ loginId: data.id, isSuccessful: isCorrect, ip });

			if (!isCorrect) {
				const isLastAttempt = login.attempts.length + 1 >= AUTH_CODE_MAX_ATTEMPTS;
				return {
					errorCode: isLastAttempt ? 'CODE_EXHAUSTED' : 'CODE_INVALID',
				} as const;
			}

			let user = login.activeUserByContact;

			if (login.userId && login.userId !== user?.id) {
				return { errorCode: 'USER_DEACTIVATED' } as const;
			}

			if (!user) {
				if (!AUTH_ALLOW_UNREGISTERED) error(403);

				const created = tx.insertUser(data.contact);
				user = tx.findUser(created.id) ?? null;
				if (!user) error(500);
			}

			if (!login.userId) tx.linkUser({ id: data.id, userId: user.id });

			return { user };
		},
		{ behavior: 'immediate' },
	) satisfies { user: unknown } | { errorCode: ValidateErrorCode };

	if (result.errorCode) {
		if (result.errorCode === 'CODE_INVALID') invalid(issue.code(validateErrors[result.errorCode]));
		return result;
	}

	await issueToken({
		sub: result.user.id,
		roles: new Set(result.user.activeRoles.map((row) => row.role)),
		profile: !!result.user.profile,
	});

	redirect(303, getRedirectDestination());
});
