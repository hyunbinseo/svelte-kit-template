import { hash } from 'node:crypto';
import type { Logger } from 'drizzle-orm';
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { logTable, queryTable } from './schema.ts';

export const SELECT_PREFIX = 'select ';

export const createAuditLogger = (
	auditDb: NodeSQLiteDatabase,
	onError: (error: unknown) => void,
	getContext: () => Pick<typeof logTable.$inferInsert, 'sub' | 'ip' | 'pathname'>,
	{ logSelectQueries }: { logSelectQueries: boolean },
): Logger => ({
	logQuery: (query, params) => {
		if (!logSelectQueries && query.startsWith(SELECT_PREFIX)) return;

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
