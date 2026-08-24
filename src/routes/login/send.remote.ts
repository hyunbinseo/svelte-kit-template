import { randomInt, randomUUID } from 'node:crypto';
import { dev } from '$app/env';
import { form, getRequestEvent } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { isNull } from 'drizzle-orm';
import { ALLOW_UNREGISTERED, AUTH_CODE_LENGTH } from '#lib/config.ts';
import { loginTable, userTable } from '#lib/database/schema.ts';
import { requireLoggedOut } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/database/client.ts';
import { SendCodeSchema } from './send.ts';
import { RATE_LIMITED, UNREGISTERED } from './shared.ts';

export const sendCode = form(SendCodeSchema, async (data, issue) => {
	requireLoggedOut();

	let user = db.query.userTable
		.findFirst({
			where: {
				contact: data.contact,
				deactivatedAt: { isNull: true },
			},
			columns: { id: true },
		})
		.sync();

	if (!user && !ALLOW_UNREGISTERED) invalid(issue.contact(UNREGISTERED));

	user =
		user ??
		db
			.insert(userTable)
			.values(data)
			.onConflictDoUpdate({
				target: userTable.contact,
				targetWhere: isNull(userTable.deactivatedAt),
				set: { contact: userTable.contact },
			})
			.returning({ id: userTable.id })
			.all()[0]!;

	const existingLogin = db.query.loginTable
		.findFirst({
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
		})
		.sync();

	if (existingLogin && !existingLogin.successfulAttempts.length) {
		invalid(issue.contact(RATE_LIMITED));
	}

	const code = randomInt(0, Math.pow(10, AUTH_CODE_LENGTH))
		.toString()
		.padStart(AUTH_CODE_LENGTH, '0');

	const sendId = randomUUID(); // TODO Implement actual send logic

	if (dev) console.table({ contact: data.contact, code });

	const login = db
		.insert(loginTable)
		.values({
			sendId,
			userId: user.id,
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
