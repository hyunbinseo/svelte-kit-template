import { eq } from 'drizzle-orm';
import type { InferOutput } from 'valibot';
import { loginAttemptTable, loginTable, userTable } from '#database/schema.ts';
import { pick } from '#lib/pick.ts';
import type { Database } from '../../../app.d.ts';
import type { ValidateCodeSchema } from './shared.ts';

export const findLogin = (
	tx: Database,
	data: Pick<InferOutput<typeof ValidateCodeSchema>, 'id' | 'contact'>,
) =>
	tx.query.loginTable
		.findFirst({
			where: pick(data, ['id', 'contact']),
			columns: { userId: true, code: true, expiresAt: true, ip: true },
			with: {
				attempts: { columns: { isSuccessful: true } },
				activeUserByContact: {
					columns: { id: true },
					with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
				},
			},
		})
		.sync();

export const recordAttempt = (
	tx: Database,
	data: Pick<typeof loginAttemptTable.$inferInsert, 'loginId' | 'isSuccessful' | 'ip'>,
) => {
	tx.insert(loginAttemptTable)
		.values(pick(data, ['loginId', 'isSuccessful', 'ip']))
		.run();
};

export const insertUser = (
	tx: Database,
	data: Pick<InferOutput<typeof ValidateCodeSchema>, 'contact'>,
) =>
	tx
		.insert(userTable)
		.values(pick(data, ['contact']))
		.returning({ id: userTable.id })
		.all()[0]!;

export const findUser = (tx: Database, data: Pick<typeof userTable.$inferSelect, 'id'>) =>
	tx.query.userTable
		.findFirst({
			where: pick(data, ['id']),
			columns: { id: true },
			with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
		})
		.sync();

export const linkUser = (
	tx: Database,
	data: Pick<typeof loginTable.$inferSelect, 'id' | 'userId'>,
) => {
	tx.update(loginTable)
		.set(pick(data, ['userId']))
		.where(eq(loginTable.id, data.id))
		.run();
};
