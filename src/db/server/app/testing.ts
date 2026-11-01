import { randomBytes } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { type AppDb, createAppDb } from '#db/app/drizzle.ts';
import { loginAttemptTable, type LoginInsert, loginTable } from '#db/app/schema.ts';
import { openConnection } from '#db/shared/connection.ts';

export const createTestAppDb = (path = ':memory:') => {
	const connection = openConnection(path);

	migrate(drizzle({ client: connection }), { migrationsFolder: 'drizzle/app' });

	// Disposable, for `using`
	return Object.assign(createAppDb(connection), {
		[Symbol.dispose]: () => connection.close(),
	});
};

// A login with one attempt
export const seedLogin = (db: AppDb, login: Pick<LoginInsert, 'contact' | 'userId'>) => {
	const now = new Date();

	const insertedLogin = db
		.insert(loginTable)
		.values({
			...login,
			codeHash: randomBytes(32),
			createdAt: now,
			expiresAt: new Date(now.getTime() + 1),
			ip: '::1',
		})
		.returning({ id: loginTable.id })
		.get();

	db.insert(loginAttemptTable)
		.values({ attemptedAt: now, ip: '::1', loginId: insertedLogin.id, success: false })
		.run();

	return insertedLogin.id;
};
