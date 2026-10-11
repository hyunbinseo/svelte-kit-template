import { tokenTable } from '#database/app/schema.ts';
import type { AppDb, AppTx } from '#database/app/types.ts';
import { picked } from '#database/pick.ts';

export const authQueries = (db: AppDb | AppTx) => ({
	findActiveUserById: (id: string) =>
		db.query.userTable
			.findFirst({
				where: { id, deactivatedAt: { isNull: true } },
				columns: { id: true },
				with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
			})
			.sync(),

	insertToken: picked<typeof tokenTable.$inferInsert>()(
		['userId', 'refreshedFrom', 'refreshReason', 'ip'],
		(data) =>
			db
				.insert(tokenTable)
				.values(data)
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
				.all()[0]!,
	),
});
