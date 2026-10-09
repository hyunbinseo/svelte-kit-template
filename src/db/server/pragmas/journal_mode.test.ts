import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, test } from 'vite-plus/test';
import { openDatabase } from '#database/connection.ts';

const dir = mkdtempSync(join(tmpdir(), 'journal-mode-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const read = (db: DatabaseSync) => db.prepare('PRAGMA journal_mode').get()?.['journal_mode'];

test('delete by default, overridden', () => {
	using defaultDb = new DatabaseSync(join(dir, 'default.db'));
	using db = openDatabase(join(dir, 'wal.db'));

	assert.equal(read(defaultDb), 'delete');
	assert.equal(read(db), 'wal');
});

test('persists across connections', () => {
	const filename = join(dir, 'persist.db');
	openDatabase(filename).close();

	using db = new DatabaseSync(filename);
	assert.equal(read(db), 'wal');
});

test('memory for in-memory databases', () => {
	using db = openDatabase(':memory:');
	assert.equal(read(db), 'memory');
});
