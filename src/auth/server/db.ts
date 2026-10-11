import { defineQueries } from '#database/app/client.ts';
import { tokenBanTable } from '#database/app/schema.ts';
import { findActiveUserById, insertToken } from './queries.ts';

export const db = defineQueries((db) => ({
	findActiveUserById: findActiveUserById(db),
	insertToken: insertToken(db),

	claimTokenRotation: ({
		tokenId,
		bannedBy,
		ip,
		effectiveAt,
	}: Pick<typeof tokenBanTable.$inferInsert, 'tokenId' | 'bannedBy' | 'ip' | 'effectiveAt'>) => {
		db.insert(tokenBanTable)
			.values({ tokenId, bannedBy, ip, effectiveAt, reason: 'rotate' })
			.onConflictDoNothing()
			.run();
	},

	findTokenBans: (id: string) =>
		db.query.tokenTable
			.findFirst({
				where: { id },
				columns: { id: true },
				with: { bans: { columns: { reason: true, effectiveAt: true } } },
			})
			.sync(),
}));
