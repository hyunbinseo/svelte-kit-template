import { randomInt, randomUUID } from 'node:crypto';
import { dev } from '$app/env';
import { form, getRequestEvent } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { ALLOW_UNREGISTERED, AUTH_CODE_LENGTH } from '#lib/config.ts';
import { loginTable } from '#lib/database/schema.ts';
import { requireLoggedOut } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/database/client.ts';
import { RATE_LIMITED } from './errors.ts';
import { SendCodeSchema } from './send.ts';

export const sendCode = form(SendCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const existingLogin = db.query.loginTable
		.findFirst({
			orderBy: { id: 'desc' },
			where: {
				contact: data.contact,
				expiresAt: { gte: new Date() },
			},
			columns: {},
			with: {
				successfulAttempts: {
					columns: { id: true },
				},
			},
		})
		.sync();

	if (existingLogin && !existingLogin.successfulAttempts.length) {
		invalid(issue.contact(RATE_LIMITED));
	}

	const code = randomInt(0, Math.pow(10, AUTH_CODE_LENGTH))
		.toString()
		.padStart(AUTH_CODE_LENGTH, '0');

	const shouldSend =
		ALLOW_UNREGISTERED ||
		!!db.query.userTable
			.findFirst({
				where: {
					contact: data.contact,
					deactivatedAt: { isNull: true },
				},
				columns: { id: true },
			})
			.sync();

	const sendId = randomUUID(); // TODO implement actual send logic

	if (dev && shouldSend) console.table({ contact: data.contact, code });

	const login = db
		.insert(loginTable)
		.values({
			sendId,
			contact: data.contact,
			code,
			ip: getRequestEvent().getClientAddress(),
		})
		.returning({ id: loginTable.id })
		.all()[0]!;

	return {
		id: login.id,
		contact: data.contact,
	};
});
