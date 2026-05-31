import { logTable } from '#lib/server/database/audit.schema.ts';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { exit } from 'node:process';
import { backup } from 'node:sqlite';
import { auditDb, db } from '../database.ts';
import { root } from '../utilities.ts';

const now = new Date();
const filename = `${now.valueOf()}-${now.toISOString().slice(0, 10)}.db`;

const dataBackupDir = resolve(root, 'backups/app');
mkdirSync(dataBackupDir, { recursive: true });
await backup(db.$client, resolve(dataBackupDir, filename));
db.$client.close();

const auditBackupDir = resolve(root, 'backups/audit');
mkdirSync(auditBackupDir, { recursive: true });
await backup(auditDb.$client, resolve(auditBackupDir, filename));
auditDb.delete(logTable).run();
auditDb.$client.close();

exit();
