import { tokenTable } from '#database/app/schema.ts';
import type { AppDb, AppInsert, AppTx } from '#database/app/types.ts';

export const findActiveUserById = (db: AppDb | AppTx) => (id: string) =>
	db.query.userTable
		.findFirst({
			where: { id, deactivatedAt: { isNull: true } },
			columns: { id: true },
			with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
		})
		.sync();

export const insertToken =
	(db: AppDb | AppTx) =>
	({
		userId,
		refreshedFrom,
		refreshReason,
		ip,
	}: AppInsert<'tokenTable', 'userId' | 'refreshedFrom' | 'refreshReason' | 'ip'>) =>
		db
			.insert(tokenTable)
			.values({ userId, refreshedFrom, refreshReason, ip })
			// Returns existing row.
			.onConflictDoUpdate({
				target: tokenTable.refreshedFrom,
				set: { userId: tokenTable.userId },
			})
			.returning({
				id: tokenTable.id,
				issuedAt: tokenTable.issuedAt,
				expiresAt: tokenTable.expiresAt,
			})
			.all()[0]!;
