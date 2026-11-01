import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { createAuditDatabase } from '#db/audit/server/database.ts';
import { openDatabase } from '#db/shared.server.ts';

export const createTestAuditDatabase = (path = ':memory:') => {
	const client = openDatabase(path);

	migrate(drizzle({ client }), { migrationsFolder: 'drizzle/audit' });

	// Disposable, for `using`
	return Object.assign(createAuditDatabase(client), {
		[Symbol.dispose]: () => client.close(),
	});
};
