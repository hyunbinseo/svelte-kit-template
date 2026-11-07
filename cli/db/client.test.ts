import { ok } from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { afterEach, beforeEach, expect, test } from 'vite-plus/test';
import { openDbs } from '#cli/db/client.ts';
import { ROOT } from '#cli/lib/shared.ts';
import { userTable } from '#db/app/schema.ts';
import { entryTable } from '#db/audit/schema.ts';
import { openConnection } from '#db/shared/connection.ts';
import { type DatabaseName, prepareDatabasePath } from '#db/shared/database.ts';

const SCRIPT_PATH = join(ROOT, 'cli', 'db', 'example.ts');

let dataDir: string;

beforeEach(() => {
	dataDir = mkdtempSync(join(tmpdir(), 'cli-databases-'));
});

afterEach(() => {
	rmSync(dataDir, { force: true, recursive: true });
});

test('logs the script as a staff actor, to the audit database it returns', () => {
	for (const name of ['app', 'audit'] satisfies DatabaseName[]) {
		using connection = openConnection(prepareDatabasePath(dataDir, 'e2e', name));
		migrate(drizzle({ client: connection }), { migrationsFolder: join('drizzle', name) });
	}

	using dbs = openDbs({ dataDir, mode: 'e2e', scriptPath: SCRIPT_PATH });
	dbs.db.insert(userTable).values({ contact: 'a@example.com', createdAt: new Date() }).run();

	ok(dbs.auditDb);
	const entries = dbs.auditDb
		.select({
			byStaff: entryTable.byStaff,
			ip: entryTable.ip,
			pathname: entryTable.pathname,
			userId: entryTable.userId,
		})
		.from(entryTable)
		.all();
	expect(entries).toEqual([
		{ byStaff: true, ip: null, pathname: join('cli', 'db', 'example.ts'), userId: null },
	]);
});

test('opens no audit database in development', () => {
	{
		using dbs = openDbs({ dataDir, mode: 'development', scriptPath: SCRIPT_PATH });
		expect(dbs.auditDb).toBeUndefined();
		expect(dbs.auditedDb).toBe(dbs.db);
	}

	expect(existsSync(join(dataDir, 'development', 'audit.db'))).toBe(false);
});
