import { AssertionError } from 'node:assert/strict';
import { eq, sql } from 'drizzle-orm';
import type { NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { type AppDb, createAppDatabase } from '#db/app/server/database.ts';
import { userTable } from '#db/app/server/schema.ts';
import { createTestAppDatabase } from '#db/app/server/testing.ts';
import type { AuditDb } from '#db/audit/server/database.ts';
import { auditClient, type AuditContext } from '#db/audit/server/logger.ts';
import { entrySqlTable, entryTable } from '#db/audit/server/schema.ts';
import { createTestAuditDatabase } from '#db/audit/server/testing.ts';

const now = new Date('2026-01-01T00:00:00Z');

const CONTEXT = {
	byStaff: true,
	ip: '::1',
	pathname: '/admin/users',
	userId: 1,
} satisfies AuditContext;

const IMMEDIATE = { behavior: 'immediate' } as const satisfies { behavior: 'immediate' };

let appDb: AppDb;
let auditDb: AuditDb;
let db: AppDb;
let auditedDb: AppDb;
const report = vi.fn();

beforeEach(() => {
	vi.useFakeTimers({ now, toFake: ['Date'] });
	appDb = createTestAppDatabase();
	auditDb = createTestAuditDatabase();

	const options = { auditDb, getContext: () => CONTEXT, report };
	db = createAppDatabase(auditClient(appDb.$client, { ...options, isReadAudited: false }));
	auditedDb = createAppDatabase(auditClient(appDb.$client, { ...options, isReadAudited: true }));

	return () => {
		appDb.$client.close();
		auditDb.$client.close();
	};
});

afterEach(() => {
	report.mockReset();
	vi.useRealTimers();
});

const getEntries = () =>
	auditDb
		.select({
			byStaff: entryTable.byStaff,
			failed: entryTable.failed,
			ip: entryTable.ip,
			loggedAt: entryTable.loggedAt,
			params: entryTable.params,
			pathname: entryTable.pathname,
			sql: entrySqlTable.sql,
			userId: entryTable.userId,
		})
		.from(entryTable)
		.innerJoin(entrySqlTable, eq(entryTable.sqlId, entrySqlTable.id))
		.orderBy(entryTable.id)
		.all();

const getLoggedSqls = () => getEntries().map((entry) => entry.sql);

const getUsers = () => appDb.select({ contact: userTable.contact }).from(userTable).all();

const insertUser = (target: Pick<AppDb, 'insert'>, contact: string) =>
	target.insert(userTable).values({ contact, createdAt: now }).run();

// Drizzle wraps errors thrown while running a statement.
const getRootCause = (callback: () => unknown) => {
	try {
		callback();
	} catch (error) {
		let cause = error;
		while (cause instanceof Error && cause.cause !== undefined) cause = cause.cause;
		return cause;
	}
	return expect.unreachable();
};

// A real audit write failure, for entries whose SQL matches the glob
const failEntries = (glob: string) =>
	auditDb.$client.exec(`
		CREATE TRIGGER fail_entries BEFORE INSERT ON entry
		WHEN (SELECT sql FROM entry_sql WHERE id = NEW.sql_id) GLOB '${glob}'
		BEGIN SELECT RAISE(ABORT, 'audit failed'); END
	`);

test('logs writes, including transactions and CTEs, but not reads', () => {
	db.transaction((tx) => {
		insertUser(tx, 'a@example.com');
		tx.select().from(userTable).all();
	}, IMMEDIATE);
	db.run(sql`with x as (select 1) select * from x`);
	db.select().from(userTable).all();

	expect(getLoggedSqls()).toEqual([
		'begin immediate',
		expect.stringMatching(/^insert into "user"/),
		'commit',
		'with x as (select 1) select * from x',
	]);
});

test('logs reads when opted in', () => {
	auditedDb.select({ id: userTable.id }).from(userTable).all();

	expect(getLoggedSqls()).toEqual(['select "id" from "user"']);
});

test('records the context, params, and time, and stores each SQL text once', () => {
	insertUser(db, 'a@example.com');
	insertUser(db, 'b@example.com');

	const entries = getEntries();
	expect(entries).toHaveLength(2);
	expect(entries[0]).toMatchObject({ ...CONTEXT, failed: false, loggedAt: now });
	expect(JSON.parse(entries[0]!.params)).toContain('a@example.com');
	expect(JSON.parse(entries[1]!.params)).toContain('b@example.com');
	expect(auditDb.select().from(entrySqlTable).all()).toHaveLength(1);
});

test('marks statements that fail', () => {
	insertUser(db, 'a@example.com');
	expect(() => insertUser(db, 'a@example.com')).toThrow();

	expect(getEntries().map((entry) => entry.failed)).toEqual([false, true]);
});

test('blocks a statement whose entry fails to log', () => {
	failEntries('insert*');

	expect(getRootCause(() => insertUser(db, 'a@example.com'))).toHaveProperty(
		'message',
		'audit failed',
	);
	expect(getUsers()).toEqual([]);
});

test('rolls back a transaction whose commit fails to log', () => {
	failEntries('commit');

	expect(
		getRootCause(() => db.transaction((tx) => insertUser(tx, 'a@example.com'), IMMEDIATE)),
	).toHaveProperty('message', 'audit failed');
	expect(appDb.$client.isTransaction).toBe(false);
	expect(getUsers()).toEqual([]);
	expect(getLoggedSqls().at(-1)).toBe('rollback');
});

test('rolls back a transaction whose rollback fails to log, and reports it', () => {
	failEntries('rollback*');
	const error = new Error('callback failed');

	expect(() =>
		db.transaction((tx) => {
			insertUser(tx, 'a@example.com');
			throw error;
		}, IMMEDIATE),
	).toThrow(error);
	expect(appDb.$client.isTransaction).toBe(false);
	expect(getUsers()).toEqual([]);
	expect(report).toHaveBeenCalledOnce();
});

test('rolls back a savepoint whose rollback fails to log, and reports it', () => {
	failEntries('rollback*');

	db.transaction((tx) => {
		insertUser(tx, 'a@example.com');
		// AppTx hides savepoints, see specs/06-query-layer.md
		const unsafeTx = tx as unknown as NodeSQLiteTransaction<Record<string, never>>;
		expect(() =>
			unsafeTx.transaction((savepoint) => {
				insertUser(savepoint, 'b@example.com');
				throw new Error('savepoint failed');
			}),
		).toThrow('savepoint failed');
	}, IMMEDIATE);

	expect(getUsers()).toEqual([{ contact: 'a@example.com' }]);
	expect(report).toHaveBeenCalledOnce();
});

test('throws before logging a transaction nested across clients', () => {
	expect(
		getRootCause(() =>
			db.transaction(
				() => auditedDb.transaction(() => insertUser(db, 'a@example.com'), IMMEDIATE),
				IMMEDIATE,
			),
		),
	).toBeInstanceOf(AssertionError);
	expect(appDb.$client.isTransaction).toBe(false);
	expect(getLoggedSqls()).toEqual(['begin immediate', 'rollback']);
});

test('rejects exec, which would run unlogged', () => {
	expect(() => db.$client.exec('DELETE FROM user')).toThrow(AssertionError);
});
