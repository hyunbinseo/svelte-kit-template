import { dev } from '$app/environment';
import { DATABASE_AUDIT_URL } from '$env/static/private';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { DatabaseSync } from 'node:sqlite';

// NOTE `node:sqlite` has no `fileMustExist` option
const client = dev ? null : new DatabaseSync(DATABASE_AUDIT_URL);

client?.exec('PRAGMA journal_mode = WAL');

export const auditDb = !client ? null : drizzle({ client, jit: true });

if (client) process.on('sveltekit:shutdown', () => client.close());
