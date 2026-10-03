import { timingSafeEqual } from 'node:crypto';
import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { check, fallback, parse, pipe } from 'valibot';
import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { AUTH_CODE_MAX_ATTEMPTS, AUTH_REDIRECT_PARAM } from '#lib/config.ts';
import { loginAttemptTable } from '#lib/database/schema.ts';
import { requireLoggedOut } from '#lib/server/auth/session.ts';
import { issueToken } from '#lib/server/auth/token.ts';
import { db } from '#lib/server/database/client.ts';
import { InternalAbsolutePathSchema } from '#lib/valibot.ts';
import { CODE_INVALID, type ErrorCode } from './errors.ts';
import { ValidateCodeSchema } from './validate.ts';

export const validateCode = form(ValidateCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const event = getRequestEvent();
	const ip = event.getClientAddress();

	const result = db.transaction(
		(tx) => {
			const login = tx.query.loginTable
				.findFirst({
					where: { id: data.id },
					columns: { code: true, expiresAt: true, ip: true },
					with: {
						attempts: { columns: { isSuccessful: true } },
						activeUser: {
							where: { contact: data.contact },
							columns: { id: true },
							with: {
								profile: { columns: { id: true } },
								activeRoles: { columns: { role: true } },
							},
						},
					},
				})
				.sync();

			if (!login || !login.activeUser) error(400);

			if (login.ip !== ip) return { errorCode: 'IP_MISMATCH' };
			if (login.expiresAt < new Date()) return { errorCode: 'CODE_EXPIRED' };

			if (
				login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS ||
				login.attempts.some((attempt) => attempt.isSuccessful)
			) {
				return { errorCode: 'CODE_BLOCKED' };
			}

			const isCorrect = timingSafeEqual(
				Buffer.from(login.code), //
				Buffer.from(data.code),
			);

			tx.insert(loginAttemptTable)
				.values({
					loginId: data.id,
					isSuccessful: isCorrect,
					ip,
				})
				.run();

			if (!isCorrect) return { errorCode: 'CODE_INVALID' };

			return { user: login.activeUser };
		},
		{ behavior: 'immediate' },
	) satisfies { user: unknown } | { errorCode: ErrorCode };

	if (result.errorCode === 'CODE_INVALID') invalid(issue.code(CODE_INVALID));
	if (result.errorCode) return result;

	await issueToken({
		sub: result.user.id,
		roles: new Set(result.user.activeRoles.map((row) => row.role)),
		profile: !!result.user.profile,
	});

	const destination = parse(
		fallback(
			pipe(
				InternalAbsolutePathSchema,
				check((v) => new URL(v, event.url).pathname !== resolve('login')),
			),
			LOGIN_REDIRECT,
		),
		event.url.searchParams.get(AUTH_REDIRECT_PARAM),
	);

	redirect(303, destination);
});
