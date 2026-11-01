import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { createAuditDb } from '#db/audit/drizzle.ts';
import { openConnection } from '#db/shared/connection.ts';

export const createTestAuditDb = (path = ':memory:') => {
	const connection = openConnection(path);

	migrate(drizzle({ client: connection }), { migrationsFolder: 'drizzle/audit' });

	// Disposable, for `using`
	return Object.assign(createAuditDb(connection), {
		[Symbol.dispose]: () => connection.close(),
	});
};
