import { hash } from 'node:crypto';
import type { Logger } from 'drizzle-orm';
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { logTable, queryTable } from './schema.ts';

// CTEs are logged, as they can precede writes (e.g. `WITH … INSERT`).
export const SELECT_REGEX = /^\s*select\b/i;

export type AuditScope = 'all' | 'writes';

export const createAuditLogger = (
	auditDb: NodeSQLiteDatabase,
	onError: (error: unknown) => void,
	getContext: () => Pick<typeof logTable.$inferInsert, 'sub' | 'ip' | 'pathname'>,
	{ scope }: { scope: AuditScope },
): Logger => ({
	logQuery: (query, params) => {
		if (scope === 'writes' && SELECT_REGEX.test(query)) return;

		try {
			const queryHash = hash('sha1', query, 'hex');

			auditDb
				.insert(queryTable)
				.values({ hash: queryHash, sql: query })
				.onConflictDoNothing()
				.run();

			auditDb
				.insert(logTable)
				.values({ ...getContext(), queryHash, params: JSON.stringify(params) })
				.run();
		} catch (error) {
			onError(error);
		}
	},
});
