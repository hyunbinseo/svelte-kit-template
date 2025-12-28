import { form, getRequestEvent } from '$app/server';
import { CODE_MAX_ATTEMPTS } from '$lib/config';
import { authenticate } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { loginAttemptTable } from '$lib/server/db/schema';
import { error, invalid } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { CODE_INVALID, PublicValidateCodeSchema } from '.';
import { checkSession } from './index.server';

export const validateCode = form(PublicValidateCodeSchema, async (data, issue) => {
	checkSession();

	const login = await db.query.loginTable.findFirst({
		orderBy: { id: 'desc' },
		columns: { code: true, expiresAt: true },
		where: { id: data.id },
		with: {
			attempts: { columns: { id: true } },
			activeUser: {
				columns: { id: true },
				where: { contact: data.contact },
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

	await db.insert(loginAttemptTable).values({
		loginId: data.id,
		isSuccessful: isCorrect,
		ip: getRequestEvent().getClientAddress(),
	});

	if (!isCorrect) invalid(issue.code(CODE_INVALID));

	return await authenticate({ sub: login.activeUser.id });
});
