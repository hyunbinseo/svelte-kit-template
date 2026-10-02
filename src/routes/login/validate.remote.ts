import { timingSafeEqual } from 'node:crypto';
import { form, getRequestEvent } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { AUTH_CODE_MAX_ATTEMPTS } from '#lib/config.ts';
import { loginAttemptTable, loginTable, userTable } from '#lib/database/schema.ts';
import { getRedirectUrl } from '#lib/server/auth/redirect.ts';
import { requireLoggedOut } from '#lib/server/auth/session.ts';
import { issueToken } from '#lib/server/auth/token.ts';
import { db } from '#lib/server/database/client.ts';
import { CODE_INVALID, type ErrorCode } from './errors.ts';
import { ValidateCodeSchema } from './validate.ts';

export const validateCode = form(ValidateCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const ip = getRequestEvent().getClientAddress();

	const result = db.transaction(
		(tx) => {
			const login = tx.query.loginTable
				.findFirst({
					where: { id: data.id, contact: data.contact },
					columns: { sendId: true, userId: true, code: true, expiresAt: true, ip: true },
					with: {
						attempts: { columns: { isSuccessful: true } },
						activeUser: {
							columns: { id: true },
							with: {
								profile: { columns: { id: true } },
								activeRoles: { columns: { role: true } },
							},
						},
					},
				})
				.sync();

			if (!login || (login.userId && !login.activeUser)) error(400);

			if (login.ip !== ip) return { errorCode: 'IP_MISMATCH' };
			if (login.expiresAt < new Date()) return { errorCode: 'CODE_EXPIRED' };

			if (
				login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS ||
				login.attempts.some((attempt) => attempt.isSuccessful)
			) {
				return { errorCode: 'CODE_BLOCKED' };
			}

			const isCorrect =
				!!login.sendId &&
				timingSafeEqual(
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

			if (login.activeUser) return { user: login.activeUser };

			const newUser = tx
				.insert(userTable)
				.values({ contact: data.contact })
				.onConflictDoNothing()
				.returning({ id: userTable.id })
				.all()[0];

			if (!newUser) error(400);

			tx.update(loginTable).set({ userId: newUser.id }).where(eq(loginTable.id, data.id)).run();

			return { user: { id: newUser.id, profile: null, activeRoles: [] } };
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

	redirect(303, getRedirectUrl() || LOGIN_REDIRECT);
});
