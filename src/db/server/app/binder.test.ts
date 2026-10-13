import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { test } from 'vite-plus/test';
import { createAppDb, seedUser } from '#tests/database/app.ts';
import { bindQueries } from './binder.ts';
import { userTable } from './schema.ts';
import type { AppDbOrTx } from './types.ts';

test('binds queries to the transaction', () => {
	const baseDb = createAppDb();
	const { id } = seedUser(baseDb);
	const clients: AppDbOrTx[] = [];

	const db = bindQueries(baseDb)({
		findUser: (db: AppDbOrTx) => {
			clients.push(db);
			return (id: string) => db.select().from(userTable).where(eq(userTable.id, id)).get();
		},
	});

	const found = db.transaction((tx) => tx.findUser(id));

	assert.equal(found?.id, id);
	assert.equal(clients.length, 2);
	assert.notEqual(clients[1], baseDb);
});

test('rejects async transaction callbacks', () => {
	const db = bindQueries(createAppDb())({});

	assert.throws(
		// @ts-expect-error async callbacks are not allowed
		() => db.transaction(async () => 1),
		TypeError,
	);
});

test('rejects non-factory values', () => {
	// @ts-expect-error not a query factory
	assert.throws(() => bindQueries(createAppDb())({ limit: 1 }), TypeError);
});

test('reserves transaction and runProcedure names', () => {
	// @ts-expect-error reserved name
	bindQueries(createAppDb())({ transaction: () => 1 });
	// @ts-expect-error reserved name
	bindQueries(createAppDb())({ runProcedure: () => 1 });
});
