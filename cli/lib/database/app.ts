import assert from 'node:assert/strict';
import { env } from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { DB_AUDIT_LOG_SELECT_QUERIES } from '#cli/lib/config.ts';
import { createAuditLogger } from '#database/audit/logger.ts';
import { databaseSyncOptions } from '#database/options.ts';
import { relations } from '#database/relations.ts';
import { auditDb } from './audit.ts';

assert(env.DATABASE_APP_URL);

export const appDb = drizzle({
	client: new DatabaseSync(env.DATABASE_APP_URL, databaseSyncOptions),
	relations,
	logger: createAuditLogger(auditDb, () => ({ sub: null, ip: null, pathname: null }), {
		logSelectQueries: DB_AUDIT_LOG_SELECT_QUERIES,
	}),
});
