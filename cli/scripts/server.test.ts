import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { test } from 'vite-plus/test';
import { logTable } from '#database/audit/schema.ts';
import { databaseSyncOptions } from '#database/options.ts';
import { deleteLogsThrough, findLastLogId } from './server.ts';

const schema = readFileSync(
	new URL('../../drizzle/audit/20261007061741_breezy_timeslip/migration.sql', import.meta.url),
	'utf8',
);

test('returns null when no audit logs exist', () => {
	using client = new DatabaseSync(':memory:', databaseSyncOptions);
	client.exec(schema);
	const db = drizzle({ client });

	assert.equal(findLastLogId(db), null);
});

test('returns the maximum audit log ID', () => {
	using client = new DatabaseSync(':memory:', databaseSyncOptions);
	client.exec(schema);
	const db = drizzle({ client });
	db.insert(logTable)
		.values([7, 2, 5].map((id) => ({ id, queryHash: 'query', params: '[]' })))
		.run();

	assert.equal(findLastLogId(db), 7);
});

test('deletes logs through the cutoff and preserves logs added afterwards', () => {
	using client = new DatabaseSync(':memory:', databaseSyncOptions);
	client.exec(schema);
	const db = drizzle({ client });
	db.insert(logTable)
		.values([1, 2].map((id) => ({ id, queryHash: 'query', params: '[]' })))
		.run();
	const cutoff = findLastLogId(db);
	assert.equal(cutoff, 2);
	assert.ok(cutoff != null);

	db.insert(logTable).values({ id: 3, queryHash: 'query', params: '[]' }).run();
	deleteLogsThrough(db, cutoff);

	assert.deepEqual(db.select({ id: logTable.id }).from(logTable).all(), [{ id: 3 }]);
});
