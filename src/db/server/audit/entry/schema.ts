import { sql } from 'drizzle-orm';
import { blob, check, index, integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

// SQL text, deduplicated by its SHA-256 hash
export type EntrySqlInsert = typeof entrySqlTable.$inferInsert;
export type EntrySqlSelect = typeof entrySqlTable.$inferSelect;
export const entrySqlTable = snakeCase.table(
	'entry_sql',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		hash: blob({ mode: 'buffer' }).notNull().unique(),
		sql: text().notNull(),
	},
	(t) => [check('entry_sql_hash_check', sql`length(${t.hash}) = 32`)],
);

// One per logged statement, written before it runs
export type EntryInsert = typeof entryTable.$inferInsert;
export type EntrySelect = typeof entryTable.$inferSelect;
export const entryTable = snakeCase.table(
	'entry',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		sqlId: integer()
			.notNull()
			.references(() => entrySqlTable.id),
		params: text().notNull(), // JSON
		loggedAt: integer({ mode: 'timestamp_ms' }).notNull(),
		// No foreign key: users live in the app database.
		userId: integer(),
		ip: text(),
		pathname: text().notNull(), // or the CLI script
		byStaff: integer({ mode: 'boolean' }).notNull(), // 개인정보취급자
		failed: integer({ mode: 'boolean' }).notNull(),
	},
	(t) => [index('entry_by_staff_logged_at_idx').on(t.byStaff, t.loggedAt)],
);
