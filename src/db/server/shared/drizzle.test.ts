import { inspect } from 'node:util';
import { DrizzleQueryError, type SQL, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { expect, test } from 'vite-plus/test';
import { openConnection } from '#db/shared/connection.ts';

const SECRET = 'secret-param';

const getError = (query: SQL) => {
	using connection = openConnection(':memory:');
	connection.exec("CREATE TABLE t (v TEXT CHECK (v = 'ok'))");
	try {
		drizzle({ client: connection }).run(query);
	} catch (error) {
		return error;
	}
	return expect.unreachable();
};

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
