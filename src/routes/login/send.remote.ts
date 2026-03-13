import { dev } from '$app/environment';
import { form, getRequestEvent } from '$app/server';
import { AUTH_CODE_LENGTH, IS_ALLOW_UNREGISTERED } from '$lib/config.ts';
import { loginTable, userTable } from '$lib/database/schema.ts';
import { requireNoSession } from '$lib/server/auth/session.ts';
import { db } from '$lib/server/database.ts';
import { invalid } from '@sveltejs/kit';
import { randomInt, randomUUID } from 'node:crypto';
import { PublicSendCodeSchema } from './send.ts';
import { RATE_LIMITED, UNREGISTERED } from './shared.ts';

export const sendCode = form(PublicSendCodeSchema, async (data, issue) => {
	requireNoSession();

	let user = await db.query.userTable.findFirst({
		where: {
			contact: data.contact,
			deactivatedAt: { isNull: true },
		},
		columns: { id: true },
	});

	if (!user && !IS_ALLOW_UNREGISTERED) invalid(issue.contact(UNREGISTERED));

	user = user ?? (await db.insert(userTable).values(data).returning({ id: userTable.id }))[0]!;

	const existingLogin = await db.query.loginTable.findFirst({
		orderBy: { id: 'desc' },
		where: {
			userId: user.id,
			expiresAt: { gte: new Date() },
		},
		columns: {},
		with: {
			successfulAttempts: {
				columns: { id: true },
			},
		},
	});

	if (existingLogin && !existingLogin.successfulAttempts.length) {
		invalid(issue.contact(RATE_LIMITED));
	}

	const code = randomInt(0, Math.pow(10, AUTH_CODE_LENGTH))
		.toString()
		.padStart(AUTH_CODE_LENGTH, '0');

	const sendId = randomUUID(); // TODO Implement actual send logic

	if (dev) console.table({ contact: data.contact, code });

	const login = (
		await db
			.insert(loginTable)
			.values({
				sendId,
				userId: user.id,
				code,
				ip: getRequestEvent().getClientAddress(),
			})
			.returning({ id: loginTable.id })
	)[0]!;

	return {
		id: login.id,
		contact: data.contact,
	};
});
