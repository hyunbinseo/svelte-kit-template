import { eq } from 'drizzle-orm';
import { loginAttemptTable, loginTable, userTable } from '#database/app/schema.ts';
import type { AppDbOrTx, AppInsert, AppRequired, AppSelect } from '#database/app/types.ts';

export const findLoginByIdAndContact =
	(db: AppDbOrTx) =>
	({ id, contact }: AppSelect<'loginTable', 'id' | 'contact'>) =>
		db.query.loginTable
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

export const createLoginAttempt =
	(db: AppDbOrTx) =>
	({
		loginId,
		isSuccessful,
		ip,
	}: AppInsert<'loginAttemptTable', 'loginId' | 'isSuccessful' | 'ip'>) => {
		db.insert(loginAttemptTable).values({ loginId, isSuccessful, ip }).run();
	};

export const createUser =
	(db: AppDbOrTx) =>
	({ contact }: AppInsert<'userTable', 'contact'>) =>
		db.insert(userTable).values({ contact }).returning({ id: userTable.id }).all()[0]!;

export const linkLoginToUser =
	(db: AppDbOrTx) =>
	({ id, userId }: AppRequired<'loginTable', 'id' | 'userId'>) => {
		db.update(loginTable).set({ userId }).where(eq(loginTable.id, id)).run();
	};
