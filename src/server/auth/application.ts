import { randomUUID } from 'node:crypto';
import { dev } from '$app/env';
import { captureException } from '@sentry/sveltekit';
import { ok, ResultAsync } from 'neverthrow';
import type { InferOutput } from 'valibot';
import type { ValidateCodeSchema } from '#lib/schemas/auth.ts';
import type { ISODateString } from '#lib/types.ts';
import type { Session, Sessions } from '#server/domain/auth.ts';
import type { Content, Transactions } from '#server/domain/content.ts';
import type { Failure } from '#server/domain/failure.ts';

export const sendCode = (
	transactions: Transactions,
	{ logins }: Content,
	contact: string,
	ip: string,
) =>
	transactions
		.run(({ logins }) => logins.start(contact, ip))
		.asyncAndThen((login) => {
			if (dev) console.table({ contact, code: login.code });

			const deliver = async () => {
				// TODO implement actual send logic
				const sendId = await Promise.resolve(randomUUID());
				logins.markSent(login.id, sendId);
			};

			return ResultAsync.fromPromise(deliver(), (e): Failure => {
				captureException(e);
				logins.discard(login.id);
				return { status: 500, code: 'SEND_FAILED' };
			}).map(() => ({ id: login.id, contact }));
		});

export const validateCode = (
	transactions: Transactions,
	sessions: Sessions,
	input: InferOutput<typeof ValidateCodeSchema>,
	ip: string,
) =>
	transactions
		// Wrap in `ok` so failed attempts are committed, not rolled back.
		.run(({ logins }) => ok(logins.verify(input, ip)))
		.andThen((verified) => verified)
		.asyncAndThen((user) => ResultAsync.fromSafePromise(sessions.issue(user, ip)));

export const setupProfile = async (
	{ accounts }: Content,
	sessions: Sessions,
	session: Session,
	birth: ISODateString,
	ip: string,
) => {
	accounts.setupProfile(session.sub, birth);
	return sessions.rotate(session, 'profile', ip);
};
