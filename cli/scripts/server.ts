import { lte, max, type EmptyRelations } from 'drizzle-orm';
import type { NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
import { auditDb } from '#cli/lib/database/audit.ts';
import { logTable } from '#database/audit/schema.ts';
import { withTransactions } from '#database/transaction.ts';

const findLastLogId = (
	tx: NodeSQLiteTransaction<EmptyRelations>, //
) =>
	tx
		.select({ id: max(logTable.id) })
		.from(logTable)
		.get()?.id;

const deleteLogsThrough = (
	tx: NodeSQLiteTransaction<EmptyRelations>, //
	id: typeof logTable.$inferSelect.id,
) => {
	tx.delete(logTable).where(lte(logTable.id, id)).run();
};

export const db = auditDb
	? { ...withTransactions(auditDb, { findLastLogId, deleteLogsThrough }), client: auditDb.$client }
	: null;
