import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { DrizzleQueryError, eq, sql } from 'drizzle-orm';
import { drizzle, type NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { describe, test } from 'vite-plus/test';
import { relations } from '#database/app/relations.ts';
import { userTable } from '#database/app/schema.ts';
import { DB_AUDIT_MIGRATIONS_DIR } from '#database/config.ts';
import { drizzleOptions, openDatabase } from '#database/connection.ts';
import { root } from '#tests/utilities.ts';
import { type AuditScope, createAuditLogger, SELECT_REGEX } from './logger.ts';
import { logTable, queryTable } from './schema.ts';

const appDb = drizzle({
	...drizzleOptions,
	client: openDatabase(':memory:'),
	relations,
});

const createTable = 'CREATE TABLE t (v INTEGER)';
const insert = 'INSERT INTO t (v) VALUES (1)';
const select = 'SELECT * FROM t';

const insertAndSelect = (tx: NodeSQLiteDatabase) => {
	tx.run(sql.raw(insert));
	tx.all(sql.raw(select));
};

const isNestedError = (error: unknown) =>
	error instanceof DrizzleQueryError && error.query === 'begin';

const setup = () => {
	const auditDb = drizzle({ ...drizzleOptions, client: openDatabase(':memory:') });
	migrate(auditDb, { migrationsFolder: resolve(root, DB_AUDIT_MIGRATIONS_DIR) });

	const client = openDatabase(':memory:');
	client.exec(createTable);

	const errors: unknown[] = [];

	const createLogger = (scope: AuditScope) =>
		createAuditLogger(
			auditDb,
			(error) => errors.push(error),
			() => ({ sub: null, ip: '', pathname: null }),
			{ scope },
		);

	return {
		errors,
		db: drizzle({ ...drizzleOptions, client, logger: createLogger('writes') }),
		fullyAuditedDb: drizzle({ ...drizzleOptions, client, logger: createLogger('all') }),
		loggedSql: () =>
			auditDb
				.select({ sql: queryTable.sql })
				.from(logTable)
				.innerJoin(queryTable, eq(logTable.queryHash, queryTable.hash))
				.orderBy(logTable.id)
				.all()
				.map((row) => row.sql),
	};
};

describe('select pattern', () => {
	test('select queries match the select pattern', () => {
		const queries = [
			appDb.select().from(userTable),
			appDb.select({ id: userTable.id }).from(userTable).where(eq(userTable.id, '')),
			appDb.query.userTable.findFirst({ with: { activeRoles: true } }),
			appDb.query.userTable.findMany({ columns: { id: true } }),
		];

		for (const query of queries) assert(SELECT_REGEX.test(query.toSQL().sql));
	});

	test('write queries do not match the select pattern', () => {
		const queries = [
			appDb.insert(userTable).values({ contact: '' }).returning(),
			appDb.update(userTable).set({ contact: '' }).where(eq(userTable.id, '')).returning(),
			appDb.delete(userTable).where(eq(userTable.id, '')).returning(),
		];

		for (const query of queries) assert(!SELECT_REGEX.test(query.toSQL().sql));
	});

	test('raw select queries match regardless of case and whitespace', () => {
		for (const query of ['SELECT 1', 'Select 1', '\n  select\n1']) assert(SELECT_REGEX.test(query));

		for (const query of [
			'selected',
			'INSERT INTO t SELECT 1',
			'PRAGMA select',
			'WITH x AS (SELECT 1) SELECT * FROM x',
			'WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x',
		]) {
			assert(!SELECT_REGEX.test(query));
		}
	});
});

describe('transaction logging', () => {
	test('db.transaction() logs writes only', () => {
		const { db, loggedSql, errors } = setup();

		db.transaction(insertAndSelect);

		assert.deepEqual(errors, []);
		assert.deepEqual(loggedSql(), ['begin', insert, 'commit']);
	});

	test('fullyAuditedDb.transaction() also logs selects', () => {
		const { fullyAuditedDb, loggedSql, errors } = setup();

		fullyAuditedDb.transaction(insertAndSelect);

		assert.deepEqual(errors, []);
		assert.deepEqual(loggedSql(), ['begin', insert, select, 'commit']);
	});

	test('nesting transactions across instances throws', () => {
		const { db, fullyAuditedDb, loggedSql, errors } = setup();

		assert.throws(
			() =>
				db.transaction(() => {
					fullyAuditedDb.transaction(() => {});
				}),
			isNestedError,
		);
		assert(!db.$client.isTransaction);

		assert.throws(
			() =>
				fullyAuditedDb.transaction(() => {
					db.transaction(() => {});
				}),
			isNestedError,
		);
		assert(!db.$client.isTransaction);

		assert.deepEqual(errors, []);
		assert.deepEqual(loggedSql(), ['begin', 'begin', 'rollback', 'begin', 'begin', 'rollback']);
	});

	test('fullyAuditedDb rollback reverts data, but audit entries remain', () => {
		const { db, fullyAuditedDb, loggedSql, errors } = setup();

		assert.throws(() =>
			fullyAuditedDb.transaction((tx) => {
				insertAndSelect(tx);
				throw new Error('rollback');
			}),
		);

		assert.equal(db.$client.prepare(select).all().length, 0);
		assert.deepEqual(errors, []);
		assert.deepEqual(loggedSql(), ['begin', insert, select, 'rollback']);
	});

	test('audit write errors do not block rollback', () => {
		const errors: unknown[] = [];

		const auditedDb = drizzle({
			...drizzleOptions,
			client: openDatabase(':memory:'),
			logger: createAuditLogger(
				drizzle({ ...drizzleOptions, client: openDatabase(':memory:') }),
				(error) => errors.push(error),
				() => ({ sub: null, ip: '', pathname: null }),
				{ scope: 'all' },
			),
		});

		auditedDb.run(sql.raw(createTable));

		assert.throws(() =>
			auditedDb.transaction((tx) => {
				insertAndSelect(tx);
				throw new Error();
			}),
		);

		assert(!auditedDb.$client.isTransaction);
		assert.equal(auditedDb.$client.prepare(select).all().length, 0);

		const queries = [createTable, 'begin', insert, select, 'rollback'];

		assert.equal(errors.length, queries.length);

		for (const [index, query] of queries.entries()) {
			const error = errors[index];
			assert(error instanceof DrizzleQueryError && error.params.includes(query), query);
		}
	});
});
