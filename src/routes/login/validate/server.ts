import { timingSafeEqual } from 'node:crypto';
import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { check, fallback, type InferOutput, parse, pipe } from 'valibot';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import {
	AUTH_ALLOW_UNREGISTERED,
	AUTH_CODE_MAX_ATTEMPTS,
	AUTH_REDIRECT_PARAM,
} from '#auth/config.ts';
import { db } from '#database/app/client.ts';
import { loginAttemptTable, loginTable, userTable } from '#database/app/schema.ts';
import { InternalAbsolutePathSchema } from '#lib/valibot.ts';
import type { ValidateErrorCode } from './enums.ts';
import type { ValidateCodeSchema } from './shared.ts';

export const validateLogin = (data: InferOutput<typeof ValidateCodeSchema>) => {
	const ip = getRequestEvent().getClientAddress();

	return db.transaction(
		(tx) => {
			const login = tx.query.loginTable
				.findFirst({
					where: { id: data.id, contact: data.contact },
					columns: { userId: true, code: true, expiresAt: true, ip: true },
					with: {
						attempts: { columns: { isSuccessful: true } },
						activeUserByContact: {
							columns: { id: true },
							with: {
								profile: { columns: { id: true } },
								activeRoles: { columns: { role: true } },
							},
						},
					},
				})
				.sync();

			if (!login) error(400);

			if (login.expiresAt < new Date()) return { errorCode: 'codeExpired' };
			if (login.attempts.some((attempt) => attempt.isSuccessful)) return { errorCode: 'codeUsed' };

			if (login.ip !== ip) return { errorCode: 'ipMismatch' };
			if (login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS) return { errorCode: 'codeExhausted' };

			const isCorrect = timingSafeEqual(
				Buffer.from(login.code), //
				Buffer.from(data.code),
			);

			tx.insert(loginAttemptTable)
				.values({
					loginId: data.id,
					isSuccessful: isCorrect,
					ip,
				})
				.run();

			if (!isCorrect) {
				const isLastAttempt = login.attempts.length + 1 >= AUTH_CODE_MAX_ATTEMPTS;
				return { errorCode: isLastAttempt ? 'codeExhausted' : 'codeInvalid' };
			}

			let user = login.activeUserByContact;

			if (login.userId && login.userId !== user?.id) return { errorCode: 'userDeactivated' };

			if (!user) {
				if (!AUTH_ALLOW_UNREGISTERED) error(403);

				const newUser = tx
					.insert(userTable)
					.values({ contact: data.contact })
					.returning({ id: userTable.id })
					.all()[0]!;

				user =
					tx.query.userTable
						.findFirst({
							where: { id: newUser.id },
							columns: { id: true },
							with: {
								profile: { columns: { id: true } },
								activeRoles: { columns: { role: true } },
							},
						})
						.sync() ?? null;

				if (!user) error(500);
			}

			if (!login.userId) {
				tx.update(loginTable).set({ userId: user.id }).where(eq(loginTable.id, data.id)).run();
			}

			return { user };
		},
		{ behavior: 'immediate' },
	) satisfies { user: unknown } | { errorCode: ValidateErrorCode };
};

export const getRedirectDestination = () => {
	const { url } = getRequestEvent();

	return parse(
		fallback(
			pipe(
				InternalAbsolutePathSchema,
				check((v) => new URL(v, url).pathname !== resolve('login')),
			),
			AUTH_LOGIN_REDIRECT,
		),
		url.searchParams.get(AUTH_REDIRECT_PARAM),
	);
};
