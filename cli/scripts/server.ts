import { lte, max, type EmptyRelations } from 'drizzle-orm';
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { logTable } from '#database/audit/schema.ts';

export const findLastLogId = (
	db: NodeSQLiteDatabase<EmptyRelations>, //
) =>
	db
		.select({ id: max(logTable.id) })
		.from(logTable)
		.get()?.id;

export const deleteLogsThrough = (
	db: NodeSQLiteDatabase<EmptyRelations>, //
	id: typeof logTable.$inferSelect.id,
) => {
	db.delete(logTable).where(lte(logTable.id, id)).run();
};
