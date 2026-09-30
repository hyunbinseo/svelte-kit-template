import { timingSafeEqual } from 'node:crypto';
import { form, getRequestEvent } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { AUTH_CODE_MAX_ATTEMPTS } from '#lib/config.ts';
import { loginAttemptTable } from '#lib/database/schema.ts';
import { getRedirectUrl } from '#lib/server/auth/redirect.ts';
import { requireLoggedOut } from '#lib/server/auth/session.ts';
import { issueToken } from '#lib/server/auth/token.ts';
import { db } from '#lib/server/database/client.ts';
import { CODE_INVALID } from './shared.ts';
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
						attempts: { columns: { id: true } },
						successfulAttempts: { columns: { id: true } },
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

			if (login.ip !== ip) {
				return { success: false, code: 'IP_MISMATCH' } as const;
			}

			if (login.expiresAt < new Date()) {
				return { success: false, code: 'CODE_EXPIRED' } as const;
			}

			if (login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS || login.successfulAttempts.length) {
				return { success: false, code: 'CODE_BLOCKED' } as const;
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

			if (!isCorrect) return { success: false, code: 'CODE_INVALID' } as const;

			return { success: true, user: login.activeUser } as const;
		},
		{ behavior: 'immediate' },
	);

	if (!result.success) {
		if (result.code === 'CODE_INVALID') invalid(issue.code(CODE_INVALID));
		return result;
	}

	await issueToken({
		sub: result.user.id,
		roles: new Set(result.user.activeRoles.map((row) => row.role)),
		profile: !!result.user.profile,
	});

	redirect(303, getRedirectUrl() || LOGIN_REDIRECT);
});
