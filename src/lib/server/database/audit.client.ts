import { DATABASE_AUDIT_URL } from '$app/env/private';
import { drizzle } from 'drizzle-orm/node-sqlite';

export const auditDb = DATABASE_AUDIT_URL //
	? drizzle(DATABASE_AUDIT_URL, { jit: true })
	: null;

if (auditDb) {
	auditDb.$client.exec('PRAGMA journal_mode = WAL');
	process.on('sveltekit:shutdown', () => auditDb.$client.close());
}
