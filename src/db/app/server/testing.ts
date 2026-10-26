import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { createDatabase } from '#db/app/server/database.ts';
import { openDatabase } from '#db/shared.server.ts';

export const createTestDatabase = (path = ':memory:') => {
	const client = openDatabase(path);

	migrate(drizzle({ client }), { migrationsFolder: 'drizzle/app' });

	return createDatabase(client);
};
