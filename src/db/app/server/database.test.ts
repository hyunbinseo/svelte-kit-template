import { mkdtempDisposableSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect, test } from 'vite-plus/test';
import { createTestAppDatabase } from '#db/app/server/testing.ts';

test('transaction types reject async callbacks, non-immediate configs, and savepoints', () => {
	using db = createTestAppDatabase();

	// @ts-expect-error -- async callback
	expect(db.transaction(async () => 1, { behavior: 'immediate' })).toBeInstanceOf(Promise);
	// @ts-expect-error -- deferred
	expect(db.transaction(() => 1, { behavior: 'deferred' })).toBe(1);
	// @ts-expect-error -- no config
	expect(db.transaction(() => 1)).toBe(1);

	db.transaction(
		(tx) => {
			// @ts-expect-error -- savepoint
			expect(tx.transaction).toBeTypeOf('function');
		},
		{ behavior: 'immediate' },
	);
});

test('transaction locks the database for writing on begin', () => {
	using tempDir = mkdtempDisposableSync(join(tmpdir(), 'transaction-'));
	const databasePath = join(tempDir.path, 'app.db');
	using db = createTestAppDatabase(databasePath);
	using otherConnection = new DatabaseSync(databasePath, { timeout: 0 });

	db.transaction(
		() => {
			expect(() => otherConnection.exec('BEGIN IMMEDIATE')).toThrow('database is locked');
		},
		{ behavior: 'immediate' },
	);
});
