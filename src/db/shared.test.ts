import { chmodSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspect } from 'node:util';
import { DrizzleQueryError, type SQL, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test';
import { openDatabase, prepareDatabaseFile } from '#db/shared.server.ts';

let dataDir: string;

beforeEach(() => {
	dataDir = mkdtempSync(join(tmpdir(), 'databases-'));
});

afterEach(() => {
	rmSync(dataDir, { force: true, recursive: true });
});

describe('prepareDatabaseFile', () => {
	test('returns [dataDir]/[mode]/[name].db', () => {
		expect(prepareDatabaseFile(dataDir, 'e2e', 'audit')).toBe(join(dataDir, 'e2e', 'audit.db'));
	});

	test.skipIf(process.platform === 'win32')(
		'throws if other users can access the directory',
		() => {
			prepareDatabaseFile(dataDir, 'e2e', 'app');
			chmodSync(join(dataDir, 'e2e'), 0o750);
			expect(() => prepareDatabaseFile(dataDir, 'e2e', 'app')).toThrow("'750' !== '700'");
		},
	);
});

describe('openDatabase', () => {
	test('sets a busy timeout and WAL', () => {
		using database = openDatabase(join(dataDir, 'app.db'));
		expect(database.prepare('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000 });
		expect(database.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
	});
});

describe('DrizzleQueryError', () => {
	const getError = (query: SQL) => {
		using client = openDatabase(':memory:');
		client.exec("CREATE TABLE t (v TEXT CHECK (v = 'ok'))");
		try {
			drizzle({ client }).run(query);
		} catch (error) {
			return error;
		}
		return expect.unreachable();
	};

	const SECRET = 'secret-param';

	test('hides params when preparing fails', () => {
		const error = getError(sql`SELECT * FROM missing WHERE v = ${SECRET}`);
		expect(error).toBeInstanceOf(DrizzleQueryError);
		expect(inspect(error)).not.toContain(SECRET);
	});

	test('hides params when running fails', () => {
		const error = getError(sql`INSERT INTO t VALUES (${SECRET})`);
		expect(error).toBeInstanceOf(DrizzleQueryError);
		expect(inspect(error)).not.toContain(SECRET);
	});
});
