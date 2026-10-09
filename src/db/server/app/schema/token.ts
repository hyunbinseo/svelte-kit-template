import { randomUUIDv7 } from 'node:crypto';
import { eq, isNull } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	snakeCase,
	text,
	type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { AUTH_TOKEN_EXPIRES_IN } from '#auth/config.ts';
import type { TokenBanReason, TokenRefreshReason } from '#auth/enums.ts';
import { userTable } from './user.ts';

export const tokenTable = snakeCase.table(
	'token',
	{
		id: text().primaryKey().$default(randomUUIDv7), // jti
		userId: text()
			.notNull()
			.references(() => userTable.id),
		refreshedFrom: text()
			.unique()
			.references((): AnySQLiteColumn => tokenTable.id),
		refreshReason: text().$type<TokenRefreshReason>(),
		issuedAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date()),
		expiresAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date(Date.now() + AUTH_TOKEN_EXPIRES_IN)),
		ip: text().notNull(),
	},
	(table) => [
		index('token_user_id_idx').on(table.userId),
		check('token_refresh_info_pair', eq(isNull(table.refreshedFrom), isNull(table.refreshReason))),
	],
);

export const tokenBanTable = snakeCase.table('token_ban', {
	tokenId: text()
		.primaryKey()
		.references(() => tokenTable.id),
	reason: text().$type<TokenBanReason>().notNull(),
	effectiveAt: integer({ mode: 'timestamp' }).notNull(),
	bannedAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date()),
	bannedBy: text()
		.notNull()
		.references(() => userTable.id),
	ip: text().notNull(),
});
