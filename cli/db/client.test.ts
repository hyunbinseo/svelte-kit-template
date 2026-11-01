import { ok } from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { afterEach, beforeEach, expect, test } from 'vite-plus/test';
import { openCliDatabases } from '#cli/db/client.ts';
import { ROOT } from '#cli/shared.ts';
import { userTable } from '#db/app/server/schema.ts';
import { entryTable } from '#db/audit/server/schema.ts';
import { openDatabase, prepareDatabaseFile } from '#db/shared.server.ts';

const SCRIPT_PATH = join(ROOT, 'cli', 'db', 'example.ts');

let dataDir: string;

beforeEach(() => {
	dataDir = mkdtempSync(join(tmpdir(), 'cli-databases-'));
});

afterEach(() => {
	rmSync(dataDir, { force: true, recursive: true });
});

test('logs the script as a staff actor, to the audit database it returns', () => {
	for (const name of ['app', 'audit'] as const satisfies readonly ('app' | 'audit')[]) {
		using client = openDatabase(prepareDatabaseFile(dataDir, 'e2e', name));
		migrate(drizzle({ client }), { migrationsFolder: join('drizzle', name) });
	}

	using databases = openCliDatabases({ dataDir, mode: 'e2e', scriptPath: SCRIPT_PATH });
	databases.db.insert(userTable).values({ contact: 'a@example.com', createdAt: new Date() }).run();

	ok(databases.auditDb);
	const entries = databases.auditDb
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
		using databases = openCliDatabases({ dataDir, mode: 'development', scriptPath: SCRIPT_PATH });
		expect(databases.auditDb).toBeUndefined();
		expect(databases.auditedDb).toBe(databases.db);
	}

	expect(existsSync(join(dataDir, 'development', 'audit.db'))).toBe(false);
});
