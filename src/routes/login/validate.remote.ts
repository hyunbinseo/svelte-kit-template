import { timingSafeEqual } from 'node:crypto';
import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { check, fallback, parse, pipe } from 'valibot';
import { LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import {
	AUTH_ALLOW_UNREGISTERED,
	AUTH_CODE_MAX_ATTEMPTS,
	AUTH_REDIRECT_PARAM,
} from '#auth/config.ts';
import { requireLoggedOut } from '#auth/server/session.ts';
import { issueToken } from '#auth/server/token.ts';
import { db } from '#database/client.ts';
import { loginAttemptTable, loginTable, userTable } from '#database/schema.ts';
import { InternalAbsolutePathSchema } from '#lib/valibot.ts';
import { type ValidateErrorCode, validateErrors, ValidateCodeSchema } from './validate.ts';

export const validateCode = form(ValidateCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const event = getRequestEvent();
	const ip = event.getClientAddress();

	const result = db.transaction(
		(tx) => {
			const login = tx.query.loginTable
				.findFirst({
					where: { id: data.id, contact: data.contact },
					columns: { userId: true, code: true, expiresAt: true, ip: true },
					with: {
						attempts: { columns: { isSuccessful: true } },
						activeUserByContact: {
							columns: { id: true },
							with: {
								profile: { columns: { id: true } },
								activeRoles: { columns: { role: true } },
							},
						},
					},
				})
				.sync();

			if (!login) error(400);

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

			let user = login.activeUserByContact;

			if (login.userId && user?.id !== login.userId) error(403);

			if (!user) {
				if (!AUTH_ALLOW_UNREGISTERED) error(403);

				const newUser = tx
					.insert(userTable)
					.values({ contact: data.contact })
					.returning({ id: userTable.id })
					.all()[0]!;

				user =
					tx.query.userTable
						.findFirst({
							where: { id: newUser.id },
							columns: { id: true },
							with: {
								profile: { columns: { id: true } },
								activeRoles: { columns: { role: true } },
							},
						})
						.sync() ?? null;

				if (!user) error(500);
			}

			if (!login.userId) {
				tx.update(loginTable).set({ userId: user.id }).where(eq(loginTable.id, data.id)).run();
			}

			return { user };
		},
		{ behavior: 'immediate' },
	) satisfies { user: unknown } | { errorCode: ValidateErrorCode };

	if (result.errorCode === 'CODE_INVALID') {
		invalid(issue.code(validateErrors[result.errorCode]));
	}

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
