import type { DatabaseSync } from 'node:sqlite';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
// eslint-disable-next-line no-restricted-syntax
import * as schema from '#db/app/schema.ts';
import type { DrizzleDb, DrizzleTx } from '#db/shared/drizzle.ts';

const relations = defineRelations(schema);

export type AppDb = DrizzleDb<typeof relations>;
export type AppTx = DrizzleTx<typeof relations>;

export const createAppDb = (connection: DatabaseSync) =>
	drizzle({ client: connection, relations }) as AppDb;

// Queries that don't need a caller's transaction take either.
export type AppDbOrTx = AppDb | AppTx;
