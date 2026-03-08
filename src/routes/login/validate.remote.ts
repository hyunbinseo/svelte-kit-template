import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { AUTH_CODE_MAX_ATTEMPTS } from '$lib/config';
import { loginAttemptTable } from '$lib/database/schema';
import { requireNoSession } from '$lib/server/auth/session';
import { issueToken } from '$lib/server/auth/token';
import { db } from '$lib/server/database';
import { error, invalid, redirect } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { CODE_INVALID } from './shared';
import { PublicValidateCodeSchema } from './validate';

export const validateCode = form(PublicValidateCodeSchema, async (data, issue) => {
	requireNoSession();

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

	if (login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS) {
		return { success: false, code: 'CODE_BLOCKED' } as const;
	}

	const isCorrect = timingSafeEqual(
		Buffer.from(login.code), //
		Buffer.from(data.code),
	);

	// MAYBE Use transaction for attempt insertion + token issuing

	const event = getRequestEvent();

	await db.insert(loginAttemptTable).values({
		loginId: data.id,
		isSuccessful: isCorrect,
		ip: event.getClientAddress(),
	});

	if (!isCorrect) invalid(issue.code(CODE_INVALID));

	await issueToken({
		sub: login.activeUser.id,
		roles: new Set(login.activeUser.activeRoles.map((row) => row.role)),
	});

	const returnTo = event.url.searchParams.get('returnTo');

	if (returnTo) {
		const url = new URL(returnTo, event.url);
		if (
			url.origin === event.url.origin && //
			url.pathname !== event.url.pathname
		) {
			redirect(303, url);
		}
	}

	redirect(303, resolve('/login/redirect'));
});
