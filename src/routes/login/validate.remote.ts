import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { AUTH_CODE_MAX_ATTEMPTS } from '#lib/config.ts';
import { loginAttemptTable } from '#lib/database/schema.ts';
import { getRedirectUrl } from '#lib/server/auth/redirect.ts';
import { requireNoSession } from '#lib/server/auth/session.ts';
import { issueToken } from '#lib/server/auth/token.ts';
import { db } from '#lib/server/database/client.ts';
import { form, getRequestEvent } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { CODE_INVALID } from './shared.ts';
import { ValidateCodeSchema } from './validate.ts';

export const validateCode = form(ValidateCodeSchema, async (data, issue) => {
	requireNoSession();

	const login = db.query.loginTable
		.findFirst({
			where: { id: data.id },
			columns: { code: true, expiresAt: true, ip: true },
			with: {
				attempts: { columns: { id: true } },
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

	const event = getRequestEvent();
	const ip = event.getClientAddress();

	if (login.ip !== ip) {
		return { success: false, code: 'IP_MISMATCH' } as const;
	}

	if (login.expiresAt < new Date()) {
		return { success: false, code: 'CODE_EXPIRED' } as const;
	}

	if (login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS) {
		return { success: false, code: 'CODE_BLOCKED' } as const;
	}

	const isCorrect = timingSafeEqual(
		Buffer.from(login.code), //
		Buffer.from(data.code),
	);

	db.insert(loginAttemptTable)
		.values({
			loginId: data.id,
			isSuccessful: isCorrect,
			ip,
		})
		.run();

	if (!isCorrect) invalid(issue.code(CODE_INVALID));

	await issueToken({
		sub: login.activeUser.id,
		roles: new Set(login.activeUser.activeRoles.map((row) => row.role)),
		profile: !!login.activeUser.profile,
	});

	redirect(303, getRedirectUrl() || LOGIN_REDIRECT);
});
