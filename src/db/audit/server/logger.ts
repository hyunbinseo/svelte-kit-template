import { ok } from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { AuditDb } from '#db/audit/server/database.ts';
import {
	createEntry,
	findOrCreateEntrySql,
	markEntryFailed,
} from '#db/audit/server/entry/queries.ts';
import type { EntrySelect } from '#db/audit/server/schema.ts';

export type AuditContext = Pick<EntrySelect, 'byStaff' | 'ip' | 'pathname' | 'userId'>;

type ExecuteMethod = 'all' | 'get' | 'iterate' | 'run';
const executeMethods = new Set<PropertyKey>([
	'all',
	'get',
	'iterate',
	'run',
] satisfies ExecuteMethod[]);

// Wraps a node:sqlite connection, so every statement Drizzle runs passes through it,
// including begin, commit, rollback, and savepoints.
export const auditClient = (
	client: DatabaseSync,
	{
		auditDb,
		getContext,
		isReadAudited,
		report,
	}: {
		auditDb: AuditDb;
		getContext: () => AuditContext;
		isReadAudited: boolean;
		// Audit errors that mustn't block: rollback entries, failure marks
		report: (error: unknown) => void;
	},
) => {
	const sqlIds = new Map<string, EntrySelect['sqlId']>();

	const logEntry = (sql: string, params: SQLInputValue[]) => {
		const context = getContext();

		let sqlId = sqlIds.get(sql);
		if (sqlId === undefined) {
			const hash = createHash('sha256').update(sql).digest();
			sqlId = findOrCreateEntrySql(auditDb, { hash, sql });
			sqlIds.set(sql, sqlId);
		}

		return createEntry(auditDb, {
			...context,
			loggedAt: new Date(),
			params: JSON.stringify(params),
			sqlId,
		});
	};

	const prepare = (sql: string) => {
		const statement = client.prepare(sql);

		const keyword = /^\s*(\w+)/.exec(sql)?.[1]?.toLowerCase();
		const isRead = keyword === 'select'; // CTEs (with) count as writes
		if (isRead && !isReadAudited) return statement;

		const execute =
			(method: ExecuteMethod) =>
			(...params: SQLInputValue[]) => {
				// Nesting would fail after logging, so fail before it.
				if (keyword === 'begin') ok(!client.isTransaction);

				let entryId: EntrySelect['id'] | undefined;
				try {
					entryId = logEntry(sql, params);
				} catch (error) {
					// A rollback always runs; other statements don't run unlogged.
					if (keyword !== 'rollback') throw error;
					report(error);
				}

				try {
					return statement[method](...params);
				} catch (error) {
					if (entryId !== undefined) {
						try {
							markEntryFailed(auditDb, { entryId });
						} catch (markError) {
							report(markError);
						}
					}
					throw error;
				}
			};

		return new Proxy(statement, {
			get: (target, key) => {
				if (executeMethods.has(key)) return execute(key as ExecuteMethod);
				const value: unknown = Reflect.get(target, key);
				return typeof value === 'function' ? value.bind(target) : value;
			},
		});
	};

	return new Proxy(client, {
		get: (target, key) => {
			if (key === 'prepare') return prepare;
			// Unlogged, and Drizzle doesn't use it.
			if (key === 'exec') return () => ok(false);
			const value: unknown = Reflect.get(target, key);
			return typeof value === 'function' ? value.bind(target) : value;
		},
	});
};
