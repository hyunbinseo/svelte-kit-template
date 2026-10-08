import { eq } from 'drizzle-orm';
import { loginAttemptTable, loginTable, userTable } from '#database/schema.ts';
import type { Database } from '../../../app.d.ts';

export const findLogin = (tx: Database, { id, contact }: { id: string; contact: string }) =>
	tx.query.loginTable
		.findFirst({
			where: { id, contact },
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
	tx.insert(loginAttemptTable).values(data).run();
};

export const insertUser = (tx: Database, contact: string) =>
	tx.insert(userTable).values({ contact }).returning({ id: userTable.id }).all()[0]!;

export const findUser = (tx: Database, id: string) =>
	tx.query.userTable
		.findFirst({
			where: { id },
			columns: { id: true },
			with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
		})
		.sync();

export const linkUser = (
	tx: Database,
	{ loginId, userId }: { loginId: string; userId: string },
) => {
	tx.update(loginTable).set({ userId }).where(eq(loginTable.id, loginId)).run();
};
