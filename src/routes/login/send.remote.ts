import { randomInt, randomUUID } from 'node:crypto';
import { dev } from '$app/env';
import { form, getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { invalid } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { AUTH_ALLOW_UNREGISTERED, AUTH_CODE_LENGTH } from '#auth/config.ts';
import { requireLoggedOut } from '#auth/server/session.ts';
import { db } from '#database/client.ts';
import { loginTable } from '#database/schema.ts';
import { SendCodeSchema, sendErrors } from './send.ts';

export const sendCode = form(SendCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const code = randomInt(0, Math.pow(10, AUTH_CODE_LENGTH))
		.toString()
		.padStart(AUTH_CODE_LENGTH, '0');

	const login = db.transaction(
		(tx) => {
			const user = tx.query.userTable
				.findFirst({
					where: {
						contact: data.contact,
						deactivatedAt: { isNull: true },
					},
					columns: { id: true },
				})
				.sync();

			if (!user && !AUTH_ALLOW_UNREGISTERED) invalid(issue.contact(sendErrors.UNREGISTERED));

			const existingLogin = tx.query.loginTable
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
				invalid(issue.contact(sendErrors.RATE_LIMITED));
			}

			return tx
				.insert(loginTable)
				.values({
					contact: data.contact,
					userId: user?.id ?? null,
					code,
					ip: getRequestEvent().getClientAddress(),
				})
				.returning({ id: loginTable.id })
				.all()[0]!;
		},
		{ behavior: 'immediate' },
	);

	if (dev) console.table({ contact: data.contact, code });

	try {
		// TODO implement actual send logic
		const sendId = await Promise.resolve(randomUUID());
		db.update(loginTable).set({ sendId }).where(eq(loginTable.id, login.id)).run();
	} catch (e) {
		captureException(e);
		db.delete(loginTable).where(eq(loginTable.id, login.id)).run();
		invalid(issue.contact(sendErrors.SEND_FAILED));
	}

	return {
		id: login.id,
		contact: data.contact,
	};
});
