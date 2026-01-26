import { form, getRequestEvent } from '$app/server';
import { PUBLIC_LOGIN_REDIRECT } from '$env/static/public';
import { CODE_MAX_ATTEMPTS } from '$lib/config';
import { issueToken } from '$lib/server/auth';
import { db } from '$lib/server/db/client';
import { loginAttemptTable } from '$lib/server/db/schema';
import { error, invalid, redirect } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { CODE_INVALID, PublicValidateCodeSchema } from '.';
import { checkSession } from './index.server';

export const validateCode = form(PublicValidateCodeSchema, async (data, issue) => {
	checkSession();

	const login = await db.query.loginTable.findFirst({
		where: { id: data.id },
		columns: { code: true, expiresAt: true },
		with: {
			attempts: { columns: { id: true } },
			activeUser: {
				where: { contact: data.contact },
				columns: { id: true },
				with: {
					activeRoles: {
						columns: { role: true },
					},
				},
			},
		},
	});

	if (!login || !login.activeUser) error(400);

	if (login.expiresAt < new Date()) {
		return { success: false, code: 'CODE_EXPIRED' } as const;
	}

	if (login.attempts.length >= CODE_MAX_ATTEMPTS) {
		return { success: false, code: 'CODE_BLOCKED' } as const;
	}

	const isCorrect = timingSafeEqual(
		Buffer.from(login.code), //
		Buffer.from(data.code),
	);

	// MAYBE Use transaction for attempt insertion + token issuing

	await db.insert(loginAttemptTable).values({
		loginId: data.id,
		isSuccessful: isCorrect,
		ip: getRequestEvent().getClientAddress(),
	});

	if (!isCorrect) invalid(issue.code(CODE_INVALID));

	await issueToken({
		sub: login.activeUser.id,
		roles: new Set(login.activeUser.activeRoles.map((row) => row.role)),
	});

	redirect(307, PUBLIC_LOGIN_REDIRECT);
});
