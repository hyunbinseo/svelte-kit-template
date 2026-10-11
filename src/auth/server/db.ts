import { defineQueries } from '#database/app/client.ts';
import { tokenBanTable } from '#database/app/schema.ts';
import type { AppInsert } from '#database/app/types.ts';
import { findActiveUserById, insertToken } from './queries.ts';

export const db = defineQueries((db) => ({
	findActiveUserById: findActiveUserById(db),
	insertToken: insertToken(db),

	claimTokenRotation: ({
		tokenId,
		bannedBy,
		ip,
		effectiveAt,
	}: AppInsert<'tokenBanTable', 'tokenId' | 'bannedBy' | 'ip' | 'effectiveAt'>) => {
		db.insert(tokenBanTable)
			.values({ tokenId, bannedBy, ip, effectiveAt, reason: 'rotate' })
			.onConflictDoNothing()
			.run();
	},

	findTokenWithBans: (id: string) =>
		db.query.tokenTable
			.findFirst({
				where: { id },
				columns: { id: true, issuedAt: true, expiresAt: true },
				with: { bans: { columns: { reason: true, effectiveAt: true } } },
			})
			.sync(),

	findTokenChild: (refreshedFrom: string) =>
		db.query.tokenTable.findFirst({ where: { refreshedFrom }, columns: { id: true } }).sync(),
}));
