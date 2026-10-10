import { createLocalClient, db as client } from '#database/app/client.ts';
import { tokenBanTable, tokenTable, type userTable } from '#database/app/schema.ts';
import type { AppDbOrTx } from '#database/app/types.ts';
import { picked } from '#database/pick.ts';

export const authQueries = (db: AppDbOrTx) => ({
	findActiveUserById: (id: typeof userTable.$inferSelect.id) =>
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

export const db = createLocalClient(client, (db) => ({
	...authQueries(db),

	claimTokenRotation: picked<typeof tokenBanTable.$inferInsert>()(
		['tokenId', 'bannedBy', 'ip', 'effectiveAt'],
		(data) => {
			db.insert(tokenBanTable)
				.values({ ...data, reason: 'rotate' })
				.onConflictDoNothing()
				.run();
		},
	),

	findTokenBans: (id: typeof tokenTable.$inferSelect.id) =>
		db.query.tokenTable
			.findFirst({
				where: { id },
				columns: { id: true },
				with: { bans: { columns: { reason: true, effectiveAt: true } } },
			})
			.sync(),
}));
