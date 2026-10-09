import { globSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { exit } from 'node:process';
import { backup } from 'node:sqlite';
import { captureException as _captureException } from '@sentry/sveltekit';
import { DB_APP_BACKUP_RETENTION, DB_AUDIT_BACKUP_RETENTION } from '#cli/lib/config.ts';
import { appDb } from '#cli/lib/database/app.ts';
import { auditDb } from '#cli/lib/database/audit.ts';
import { root } from '#cli/lib/utilities.ts';
import { deleteLogsThrough, findLastLogId } from './server.ts';

let failed = false;

const captureException = (error: unknown) => {
	failed = true;
	_captureException(error);
};

const dateToFilename = (date = new Date()) => date.toISOString().replace(/[^0-9TZ]/g, '-') + '.db';
const FILENAME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.db$/;

const pruneBackups = async (cwd: string, retention: number) => {
	const cutoff = dateToFilename(new Date(Date.now() - retention));
	await Promise.all(
		globSync('*.db', { cwd })
			.filter((existing) => FILENAME_REGEX.test(existing) && existing < cutoff)
			.map((existing) => rm(resolve(cwd, existing)).catch(captureException)),
	);
};

{
	const dir = resolve(root, 'backups/app');
	mkdirSync(dir, { recursive: true });
	await Promise.all([
		pruneBackups(dir, DB_APP_BACKUP_RETENTION),
		backup(appDb.$client, resolve(dir, dateToFilename()))
			.finally(() => appDb.$client.close())
			.catch(captureException),
	]);
}

if (auditDb) {
	const db = auditDb;
	const dir = resolve(root, 'backups/audit');
	mkdirSync(dir, { recursive: true });

	const cutoff = findLastLogId(db);

	await Promise.all([
		pruneBackups(dir, DB_AUDIT_BACKUP_RETENTION),
		backup(db.$client, resolve(dir, dateToFilename()))
			.then(() => {
				if (cutoff == null) return;
				deleteLogsThrough(db, cutoff);
			})
			.finally(() => db.$client.close())
			.catch(captureException),
	]);
}

exit(failed ? 1 : 0);
