import { globSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { exit } from 'node:process';
import { backup } from 'node:sqlite';
import { captureException } from '@sentry/node';
import { lte, max } from 'drizzle-orm';
import { appDb, auditDb } from '#cli/database/clients.ts';
import { root } from '#cli/lib/utilities.ts';
import { logTable } from '#database/audit/schema.ts';
import { DAY } from '#lib/time.ts';

const DB_APP_BACKUP_RETENTION = 90 * DAY;
const DB_AUDIT_BACKUP_RETENTION = 365 * DAY;

let failed = false;

const fail = (error: unknown) => {
	failed = true;
	captureException(error);
};

const dateToFilename = (date = new Date()) => date.toISOString().replace(/[^0-9TZ]/g, '-') + '.db';
const FILENAME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.db$/;

const pruneBackups = async (cwd: string, retention: number) => {
	const cutoff = dateToFilename(new Date(Date.now() - retention));
	await Promise.all(
		globSync('*.db', { cwd })
			.filter((existing) => FILENAME_REGEX.test(existing) && existing < cutoff)
			.map((existing) => rm(resolve(cwd, existing)).catch(fail)),
	);
};

const backupApp = async () => {
	try {
		const dir = resolve(root, 'backups/app');
		mkdirSync(dir, { recursive: true });

		await Promise.all([
			pruneBackups(dir, DB_APP_BACKUP_RETENTION),
			backup(appDb.$client, resolve(dir, dateToFilename())).catch(fail),
		]);
	} catch (error) {
		fail(error);
	} finally {
		appDb.$client.close();
	}
};

const backupAudit = async () => {
	const db = auditDb;
	if (!db) return;

	try {
		const dir = resolve(root, 'backups/audit');
		mkdirSync(dir, { recursive: true });

		const cutoff = db
			.select({ id: max(logTable.id) })
			.from(logTable)
			.get();

		await Promise.all([
			pruneBackups(dir, DB_AUDIT_BACKUP_RETENTION),
			backup(db.$client, resolve(dir, dateToFilename()))
				.then(() => {
					if (cutoff?.id == null) return;
					db.delete(logTable).where(lte(logTable.id, cutoff.id)).run();
				})
				.catch(fail),
		]);
	} catch (error) {
		fail(error);
	} finally {
		db.$client.close();
	}
};

await backupApp();
await backupAudit();

exit(failed ? 1 : 0);
