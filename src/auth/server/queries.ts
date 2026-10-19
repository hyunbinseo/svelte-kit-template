import { and, eq, isNull } from 'drizzle-orm';
import { userSessionTable } from '#database/app/schema.ts';
import type { AppDbOrTx, AppInsert, AppRequired } from '#database/app/types.ts';

export const createSession =
	(db: AppDbOrTx) =>
	({ userId, secretHash, ip }: AppInsert<'userSessionTable', 'userId' | 'secretHash' | 'ip'>) =>
		db
			.insert(userSessionTable)
			.values({ userId, secretHash, ip })
			.returning({ id: userSessionTable.id, expiresAt: userSessionTable.expiresAt })
			.all()[0]!;

export const findLiveSessionById = (db: AppDbOrTx) => (id: string) =>
	db.query.userSessionTable
		.findFirst({
			where: { id, expiresAt: { gt: new Date() }, revokedAt: { isNull: true } },
			columns: { id: true, userId: true, secretHash: true, expiresAt: true },
			with: { profile: { columns: { id: true } } },
		})
		.sync();

export const findActiveUserRolesByUserId = (db: AppDbOrTx) => (userId: string) =>
	db.query.userRoleTable
		.findMany({
			where: { userId, revokedAt: { isNull: true } },
			columns: { role: true },
		})
		.sync();

export const markSessionRefreshed =
	(db: AppDbOrTx) =>
	({ id, expiresAt }: AppRequired<'userSessionTable', 'id' | 'expiresAt'>) => {
		db.update(userSessionTable)
			.set({ expiresAt })
			.where(and(eq(userSessionTable.id, id), isNull(userSessionTable.revokedAt)))
			.run();
	};
