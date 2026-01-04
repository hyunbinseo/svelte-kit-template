import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { randomInt } from 'node:crypto';
import { ulid } from 'ulid';
import { AUTH_TOKEN_EXPIRES_IN, CODE_EXPIRES_IN, CODE_LENGTH } from '../../config.ts';

export const userTable = sqliteTable('user', {
	id: text().primaryKey().$default(ulid),
	contact: text().notNull(),
	deactivatedAt: integer({ mode: 'timestamp' }),
});

export const loginTable = sqliteTable('login', {
	id: text().primaryKey().$default(ulid),
	userId: text()
		.notNull()
		.references(() => userTable.id),
	code: text()
		.notNull()
		.$default(() => randomInt(0, Math.pow(10, CODE_LENGTH)).toString().padStart(CODE_LENGTH, '0')),
	expiresAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date(Date.now() + CODE_EXPIRES_IN)),
	ip: text().notNull(),
});

export const loginAttemptTable = sqliteTable('login_attempt', {
	id: integer().primaryKey(),
	loginId: text()
		.notNull()
		.references(() => loginTable.id),
	isSuccessful: integer({ mode: 'boolean' }).notNull(),
	attemptedAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date()),
	ip: text().notNull(),
});

export const tokenTable = sqliteTable('token', {
	id: text().primaryKey().$default(ulid), // jti
	userId: text()
		.notNull()
		.references(() => userTable.id),
	issuedAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date()),
	expiresAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date(Date.now() + AUTH_TOKEN_EXPIRES_IN)),
	ip: text().notNull(),
});

export const tokenBanTable = sqliteTable('token_ban', {
	tokenId: text()
		.primaryKey()
		.references(() => tokenTable.id),
	type: text({ enum: ['logout', 'refresh'] }).notNull(),
	effectiveAt: integer({ mode: 'timestamp' }).notNull(),
	createdAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date()),
	ip: text().notNull(),
});
