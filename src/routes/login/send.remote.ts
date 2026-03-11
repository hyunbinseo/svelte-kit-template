import { dev } from '$app/environment';
import { form, getRequestEvent } from '$app/server';
import { AUTH_CODE_LENGTH, IS_ALLOW_UNREGISTERED } from '$lib/config';
import { loginTable, userTable } from '$lib/database/schema';
import { requireNoSession } from '$lib/server/auth/session';
import { db } from '$lib/server/database';
import { invalid } from '@sveltejs/kit';
import { randomInt, randomUUID } from 'node:crypto';
import { PublicSendCodeSchema } from './send';
import { RATE_LIMITED, UNREGISTERED } from './shared';

export const sendCode = form(PublicSendCodeSchema, async (data, issue) => {
	requireNoSession();

	let user = await db.query.userTable.findFirst({
		orderBy: { id: 'desc' },
		where: {
			contact: data.contact,
			deactivatedAt: { isNull: true },
		},
	});

	if (!user) {
		if (!IS_ALLOW_UNREGISTERED) {
			invalid(issue.contact(UNREGISTERED));
		}
		user = (await db
			.insert(userTable)
			.values(data)
			.returning()
			.then(([user]) => user))!;
	}

	const existingLogin = await db.query.loginTable.findFirst({
		orderBy: { id: 'desc' },
		where: {
			userId: user.id,
			expiresAt: { gte: new Date() },
		},
		columns: {},
		with: {
			attempts: {
				orderBy: { id: 'desc' },
				columns: { isSuccessful: true },
			},
		},
	});

	if (existingLogin && !existingLogin.attempts.some((a) => a.isSuccessful)) {
		invalid(issue.contact(RATE_LIMITED));
	}

	const code = randomInt(0, Math.pow(10, AUTH_CODE_LENGTH))
		.toString()
		.padStart(AUTH_CODE_LENGTH, '0');

	const sendId = randomUUID(); // TODO Implement actual send logic

	if (dev) console.table({ contact: data.contact, code });

	const login = (await db
		.insert(loginTable)
		.values({
			sendId,
			userId: user.id,
			code,
			ip: getRequestEvent().getClientAddress(),
		})
		.returning({ id: loginTable.id })
		.then(([login]) => login))!;

	return {
		id: login.id,
		contact: data.contact,
	};
});
