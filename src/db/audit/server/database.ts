import type { DatabaseSync } from 'node:sqlite';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
// eslint-disable-next-line no-restricted-syntax
import * as schema from '#db/audit/server/schema.ts';
import type { DrizzleDb, DrizzleTx } from '#db/shared.server.ts';

const relations = defineRelations(schema);

export type AuditDb = DrizzleDb<typeof relations>;
export type AuditTx = DrizzleTx<typeof relations>;

// Not wrapped in auditClient: logging an entry would log itself, endlessly.
export const createAuditDatabase = (client: DatabaseSync) =>
	drizzle({ client, relations }) as AuditDb;
