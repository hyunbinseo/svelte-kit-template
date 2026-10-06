import { hash } from 'node:crypto';
import type { DrizzleConfig } from 'drizzle-orm';
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { logTable, queryTable } from './schema.ts';

type AuditContext = Pick<typeof logTable.$inferInsert, 'sub' | 'ip' | 'pathname'>;

export const createAuditLogger = (
	auditDb: NodeSQLiteDatabase | null,
	getContext: () => AuditContext,
	{ logSelectQueries }: { logSelectQueries: boolean },
): DrizzleConfig['logger'] =>
	!auditDb
		? false
		: {
				logQuery: (query, params) => {
					if (!logSelectQueries && query.startsWith('select ')) return;

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
				},
			};
