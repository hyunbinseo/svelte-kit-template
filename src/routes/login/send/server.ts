import { randomInt, randomUUID } from 'node:crypto';
import { getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { eq } from 'drizzle-orm';
import type { InferOutput } from 'valibot';
import { AUTH_ALLOW_UNREGISTERED, AUTH_CODE_LENGTH } from '#auth/config.ts';
import { db } from '#database/app/client.ts';
import { loginTable } from '#database/app/schema.ts';
import type { SendErrorCode } from './enums.ts';
import type { SendCodeSchema } from './shared.ts';

const generateCode = () =>
	randomInt(0, Math.pow(10, AUTH_CODE_LENGTH)).toString().padStart(AUTH_CODE_LENGTH, '0');

export const createLogin = (data: InferOutput<typeof SendCodeSchema>) => {
	const code = generateCode();
	const ip = getRequestEvent().getClientAddress();

	return db.transaction(
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

			if (!user && !AUTH_ALLOW_UNREGISTERED) return { errorCode: 'unregistered' };

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
				return { errorCode: 'rateLimited' };
			}

			const login = tx
				.insert(loginTable)
				.values({
					contact: data.contact,
					userId: user?.id ?? null,
					code,
					ip,
				})
				.returning({ id: loginTable.id })
				.all()[0]!;

			return { login, code };
		},
		{ behavior: 'immediate' },
	) satisfies { login: unknown; code: string } | { errorCode: SendErrorCode };
};

export const deliverCode = async (delivery: { loginId: string; contact: string; code: string }) => {
	let sendId: string;

	try {
		// TODO Implement actual send logic
		sendId = await Promise.resolve(randomUUID());
	} catch (error) {
		captureException(error);
		return false;
	}

	db.update(loginTable).set({ sendId }).where(eq(loginTable.id, delivery.loginId)).run();
	return true;
};

export const discardLogin = (loginId: string) => {
	db.delete(loginTable).where(eq(loginTable.id, loginId)).run();
};
