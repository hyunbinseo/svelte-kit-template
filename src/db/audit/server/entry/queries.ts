import { ok } from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import type { AuditDb } from '#db/audit/server/database.ts';
import {
	type EntrySelect,
	type EntrySqlSelect,
	entrySqlTable,
	entryTable,
} from '#db/audit/server/schema.ts';

// Autocommit: an entry must be stored before its statement runs.
export const findOrCreateEntrySql = (
	db: AuditDb,
	{ hash, sql }: { hash: EntrySqlSelect['hash']; sql: EntrySqlSelect['sql'] },
) => {
	const createdSql = db
		.insert(entrySqlTable)
		.values({ hash, sql })
		.onConflictDoNothing()
		.returning({ id: entrySqlTable.id })
		.get();
	if (createdSql) return createdSql.id;

	const existingSql = db
		.select({ id: entrySqlTable.id })
		.from(entrySqlTable)
		.where(eq(entrySqlTable.hash, hash))
		.get();
	ok(existingSql);
	return existingSql.id;
};

export const createEntry = (
	db: AuditDb,
	{
		byStaff,
		ip,
		loggedAt,
		params,
		pathname,
		sqlId,
		userId,
	}: {
		byStaff: EntrySelect['byStaff'];
		ip: EntrySelect['ip'];
		loggedAt: EntrySelect['loggedAt'];
		params: EntrySelect['params'];
		pathname: EntrySelect['pathname'];
		sqlId: EntrySelect['sqlId'];
		userId: EntrySelect['userId'];
	},
) =>
	db
		.insert(entryTable)
		.values({ byStaff, failed: false, ip, loggedAt, params, pathname, sqlId, userId })
		.returning({ id: entryTable.id })
		.get().id;

export const markEntryFailed = (db: AuditDb, { entryId }: { entryId: EntrySelect['id'] }) =>
	db.update(entryTable).set({ failed: true }).where(eq(entryTable.id, entryId)).run();
