import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { test } from 'vite-plus/test';
import { createAppDb, seedUser } from '#tests/database/app.ts';
import { bindQueries } from './queries.ts';
import { userTable } from './schema.ts';
import type { AppDb, AppTx } from './types.ts';

test('binds queries to the transaction', () => {
	const baseDb = createAppDb();
	const { id } = seedUser(baseDb);
	const clients: (AppDb | AppTx)[] = [];

	const db = bindQueries(baseDb)((db) => {
		clients.push(db);
		return {
			findUser: (id: string) => db.select().from(userTable).where(eq(userTable.id, id)).get(),
		};
	});

	const found = db.transaction((tx) => tx.findUser(id));

	assert.equal(found?.id, id);
	assert.equal(clients.length, 2);
	assert.notEqual(clients[1], baseDb);
});

test('rejects async transaction callbacks', () => {
	const db = bindQueries(createAppDb())(() => ({}));

	assert.throws(
		// @ts-expect-error async callbacks are not allowed
		() => db.transaction(async () => 1),
		TypeError,
	);
});

test('reserves transaction and runProcedure names', () => {
	// @ts-expect-error reserved name
	bindQueries(createAppDb())(() => ({ transaction: () => 1 }));
	// @ts-expect-error reserved name
	bindQueries(createAppDb())(() => ({ runProcedure: () => 1 }));
});
