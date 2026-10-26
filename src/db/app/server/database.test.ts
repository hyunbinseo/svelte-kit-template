import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect, test } from 'vite-plus/test';
import { createTestDatabase } from '#db/app/server/testing.ts';

test('transaction types reject async callbacks, non-immediate configs, and savepoints', () => {
	const db = createTestDatabase();
	try {
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
	} finally {
		db.$client.close();
	}
});

test('transaction locks the database for writing on begin', () => {
	const tempDir = mkdtempSync(join(tmpdir(), 'transaction-'));
	const databasePath = join(tempDir, 'app.db');
	const db = createTestDatabase(databasePath);

	try {
		using otherConnection = new DatabaseSync(databasePath, { timeout: 0 });
		db.transaction(
			() => {
				expect(() => otherConnection.exec('BEGIN IMMEDIATE')).toThrow('database is locked');
			},
			{ behavior: 'immediate' },
		);
	} finally {
		db.$client.close();
		rmSync(tempDir, { force: true, recursive: true });
	}
});
