import { gt } from 'drizzle-orm';
import type { TokenRevokeReason } from '#auth/enums.ts';
import { db as client, silentDb as silentClient } from '#database/client.ts';
import { tokenBanTable, tokenTable, type userTable } from '#database/schema.ts';
import { withTransactions } from '#database/transaction.ts';
import { pick } from '#lib/pick.ts';

const insertToken = (
	tx: App.Database, //
	data: Pick<
		typeof tokenTable.$inferInsert,
		| 'userId' //
		| 'refreshedFrom'
		| 'refreshReason'
		| 'ip'
	>,
) =>
	tx
		.insert(tokenTable)
		.values(pick(data, ['userId', 'refreshedFrom', 'refreshReason', 'ip']))
		.onConflictDoUpdate({ target: tokenTable.refreshedFrom, set: { userId: tokenTable.userId } })
		.returning({
			id: tokenTable.id,
			issuedAt: tokenTable.issuedAt,
			expiresAt: tokenTable.expiresAt,
		})
		.all()[0]!;

const claimTokenRotation = (
	tx: App.Database, //
	data: Pick<
		typeof tokenBanTable.$inferSelect,
		| 'tokenId' //
		| 'bannedBy'
		| 'ip'
		| 'effectiveAt'
	>,
) => {
	const claimed = tx
		.insert(tokenBanTable)
		.values({ ...pick(data, ['tokenId', 'bannedBy', 'ip', 'effectiveAt']), reason: 'rotate' })
		.onConflictDoNothing()
		.returning({ tokenId: tokenBanTable.tokenId })
		.all();
	return claimed.length > 0;
};

const findActiveUserById = (
	tx: App.Database, //
	id: typeof userTable.$inferSelect.id,
) =>
	tx.query.userTable
		.findFirst({
			where: { id, deactivatedAt: { isNull: true } },
			columns: { id: true },
			with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
		})
		.sync();

const findTokenBan = (
	tx: App.Database, //
	tokenId: typeof tokenBanTable.$inferSelect.tokenId,
) =>
	tx.query.tokenBanTable
		.findFirst({
			where: { tokenId },
			columns: { reason: true, effectiveAt: true },
		})
		.sync();

const revokeToken = (
	tx: App.Database, //
	data: Pick<
		typeof tokenBanTable.$inferSelect,
		| 'tokenId' //
		| 'bannedBy'
		| 'ip'
		| 'bannedAt'
	> & { reason: TokenRevokeReason },
) => {
	const values = {
		...pick(data, ['reason', 'bannedBy', 'ip', 'bannedAt']),
		effectiveAt: data.bannedAt,
	};
	tx.insert(tokenBanTable)
		.values({ tokenId: data.tokenId, ...values })
		.onConflictDoUpdate({
			target: tokenBanTable.tokenId,
			set: values,
			setWhere: gt(tokenBanTable.effectiveAt, data.bannedAt),
		})
		.run();
};

export const db = withTransactions(client, {
	insertToken,
	claimTokenRotation,
	findActiveUserById,
	revokeToken,
});
export const silentDb = withTransactions(silentClient, { findTokenBan });
