import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { afterAll, describe, test } from 'vite-plus/test';
import { databaseOptions } from '#database/connection.ts';

const HOLD_MS = 1000;
assert(HOLD_MS < databaseOptions.timeout);

const SQLITE_BUSY = { code: 'ERR_SQLITE_ERROR', errcode: 5 } as const;
const SQLITE_BUSY_SNAPSHOT = { code: 'ERR_SQLITE_ERROR', errcode: 517 } as const;

const dir = mkdtempSync(join(tmpdir(), 'busy-timeout-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let count = 0;
const createFile = (journalMode: 'DELETE' | 'WAL') => {
	const filename = join(dir, `${count++}.db`);
	const db = new DatabaseSync(filename);
	db.exec(`PRAGMA journal_mode = ${journalMode}`);
	db.exec('CREATE TABLE t (v INTEGER)');
	db.close();
	return filename;
};

const holdWriteLock = async (filename: string) => {
	const worker = new Worker(
		`
		const { DatabaseSync } = require('node:sqlite');
		const { parentPort, workerData } = require('node:worker_threads');
		const db = new DatabaseSync(workerData.filename);
		db.exec('BEGIN IMMEDIATE');
		db.exec('INSERT INTO t (v) VALUES (0)');
		parentPort.postMessage('locked');
		Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, workerData.holdMs);
		db.exec('COMMIT');
		db.close();
		`,
		{ eval: true, workerData: { filename, holdMs: HOLD_MS } },
	);
	await once(worker, 'message');
	return worker;
};

const elapsed = (fn: () => void) => {
	const start = performance.now();
	fn();
	return performance.now() - start;
};

test('0 by default, overridden', () => {
	const read = (db: DatabaseSync) => db.prepare('PRAGMA busy_timeout').get()?.['timeout'];
	using defaultDb = new DatabaseSync(':memory:');
	using db = new DatabaseSync(':memory:', databaseOptions);

	assert.equal(read(defaultDb), 0);
	assert.equal(read(db), databaseOptions.timeout);
});

for (const journalMode of ['DELETE', 'WAL'] as const) {
	describe(`journal_mode = ${journalMode}`, () => {
		test('BEGIN IMMEDIATE waits', async () => {
			const filename = createFile(journalMode);
			using db = new DatabaseSync(filename, databaseOptions);
			const worker = await holdWriteLock(filename);

			const ms = elapsed(() => {
				db.exec('BEGIN IMMEDIATE');
				db.exec('SELECT * FROM t');
				db.exec('INSERT INTO t (v) VALUES (1)');
				db.exec('COMMIT');
			});

			assert(ms >= HOLD_MS / 2, `${ms}ms`);
			await once(worker, 'exit');
		});

		test('deferred write only waits', async () => {
			const filename = createFile(journalMode);
			using db = new DatabaseSync(filename, databaseOptions);
			const worker = await holdWriteLock(filename);

			const ms = elapsed(() => {
				db.exec('BEGIN');
				db.exec('INSERT INTO t (v) VALUES (1)');
				db.exec('COMMIT');
			});

			assert(ms >= HOLD_MS / 2, `${ms}ms`);
			await once(worker, 'exit');
		});

		test('deferred read → write, lock held, throws immediately', () => {
			const filename = createFile(journalMode);
			using holder = new DatabaseSync(filename, databaseOptions);
			using db = new DatabaseSync(filename, databaseOptions);

			holder.exec('BEGIN IMMEDIATE');
			holder.exec('INSERT INTO t (v) VALUES (0)');

			db.exec('BEGIN');
			db.exec('SELECT * FROM t');

			const ms = elapsed(() =>
				assert.throws(() => db.exec('INSERT INTO t (v) VALUES (1)'), SQLITE_BUSY),
			);

			assert(ms < databaseOptions.timeout, `${ms}ms`);
		});
	});
}

test('deferred read → write, stale snapshot (WAL), throws immediately', () => {
	const filename = createFile('WAL');
	using other = new DatabaseSync(filename, databaseOptions);
	using db = new DatabaseSync(filename, databaseOptions);

	db.exec('BEGIN');
	db.exec('SELECT * FROM t');
	other.exec('INSERT INTO t (v) VALUES (0)');

	const ms = elapsed(() =>
		assert.throws(() => db.exec('INSERT INTO t (v) VALUES (1)'), SQLITE_BUSY_SNAPSHOT),
	);

	assert(ms < databaseOptions.timeout, `${ms}ms`);
});
