import { DB_AUDIT_BACKUP_RETENTION, DB_BACKUP_RETENTION } from '#cli/config.ts';
import { auditDb, db } from '#cli/database.ts';
import { root } from '#cli/utilities.ts';
import { logTable } from '#lib/server/database/audit.schema.ts';
import { captureException } from '@sentry/node';
import { globSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { exit } from 'node:process';
import { backup } from 'node:sqlite';
import { digits, minLength, pipe, safeParse, string, transform } from 'valibot';

const now = new Date();

const filename = `${now.valueOf()}-${now.toISOString().slice(0, 10)}.db`;
const FilenameToTimestampSchema = pipe(
	string(),
	transform((s) => {
		const i = s.indexOf('-');
		return i !== -1 ? s.slice(0, i) : '';
	}),
	minLength(13),
	digits(),
	transform(Number),
);

const pruneBackups = async (dir: string, cutoff: number) => {
	await Promise.all(
		globSync('*.db', { cwd: dir }).flatMap((filename) => {
			const result = safeParse(FilenameToTimestampSchema, filename);
			if (!result.success || result.output >= cutoff) return [];
			return rm(resolve(dir, filename)).catch(captureException);
		}),
	);
};

const dataBackupDir = resolve(root, 'backups/app');
mkdirSync(dataBackupDir, { recursive: true });
await backup(db.$client, resolve(dataBackupDir, filename));
db.$client.close();
await pruneBackups(dataBackupDir, now.valueOf() - DB_BACKUP_RETENTION);

if (auditDb) {
	const auditBackupDir = resolve(root, 'backups/audit');
	mkdirSync(auditBackupDir, { recursive: true });
	await backup(auditDb.$client, resolve(auditBackupDir, filename));
	auditDb.delete(logTable).run();
	auditDb.$client.close();
	await pruneBackups(auditBackupDir, now.valueOf() - DB_AUDIT_BACKUP_RETENTION);
}

exit();
