import assert from 'node:assert/strict';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'vite-plus/test';
import { openDatabase } from '#database/connection.ts';
import { createTemporaryDir } from '#tests/temporary.ts';

const dir = createTemporaryDir('journal-mode-');

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
