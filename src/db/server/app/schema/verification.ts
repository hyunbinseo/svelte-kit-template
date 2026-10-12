import { randomUUIDv7 } from 'node:crypto';
import { integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

export const verificationTable = snakeCase.table('verification', {
	id: text().primaryKey().$default(randomUUIDv7),
	identifier: text().notNull().unique(),
	value: text().notNull(),
	expiresAt: integer({ mode: 'timestamp' }).notNull(),
	createdAt: integer({ mode: 'timestamp' }).notNull(),
	updatedAt: integer({ mode: 'timestamp' }).notNull(),
});
