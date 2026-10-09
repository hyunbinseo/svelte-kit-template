import { hash } from 'node:crypto';
import type { Logger } from 'drizzle-orm';
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { logTable, queryTable } from './schema.ts';

// CTEs are logged, as they can precede writes (e.g. `WITH … INSERT`).
export const SELECT_REGEX = /^\s*select\b/i;
const ROLLBACK_REGEX = /^\s*rollback\b/i;

export type AuditScope = 'all' | 'writes';

export class AuditWriteError extends Error {
	override readonly name = 'AuditWriteError';
	readonly query: string;

	constructor(query: string, options?: ErrorOptions) {
		super(`Failed to log query: ${query}`, options);
		this.query = query;
	}
}

export const createAuditLogger = (
	auditDb: NodeSQLiteDatabase,
	onRollbackError: (error: AuditWriteError) => void,
	getContext: () => Pick<typeof logTable.$inferInsert, 'sub' | 'ip' | 'pathname'>,
	{ scope }: { scope: AuditScope },
): Logger => ({
	// BLOCKED Mark failed queries, as logs are written before execution.
	// See https://github.com/drizzle-team/drizzle-orm/issues/387
	logQuery: (query, params) => {
		if (scope === 'writes' && SELECT_REGEX.test(query)) return;

		try {
			const queryHash = hash('sha1', query, 'hex');

			auditDb.transaction((tx) => {
				tx.insert(queryTable).values({ hash: queryHash, sql: query }).onConflictDoNothing().run();

				tx.insert(logTable)
					.values({ ...getContext(), queryHash, params: JSON.stringify(params) })
					.run();
			});
		} catch (cause) {
			const error = new AuditWriteError(query, { cause });
			if (!ROLLBACK_REGEX.test(query)) throw error;
			onRollbackError(error);
		}
	},
});
