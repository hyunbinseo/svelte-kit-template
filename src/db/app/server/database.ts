import type { DatabaseSync } from 'node:sqlite';
import { defineRelations } from 'drizzle-orm';
import { drizzle, type NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
// eslint-disable-next-line no-restricted-syntax
import * as schema from '#db/app/server/schema.ts';

const relations = defineRelations(schema);

export type AppDb = Omit<ReturnType<typeof drizzle<typeof relations>>, 'transaction'> & {
	// Immediate, so read-then-write paths can't be interleaved by another writer.
	// Sync only: node:sqlite would commit an async callback at its first await.
	transaction: <T>(
		callback: (tx: AppTx) => T extends PromiseLike<unknown> ? never : T,
		config: { behavior: 'immediate' },
	) => T;
};

// No savepoints (nested transactions): code given a tx runs its statements in it.
export type AppTx = Omit<NodeSQLiteTransaction<typeof relations>, 'transaction'>;

export const createDatabase = (client: DatabaseSync) => drizzle({ client, relations }) as AppDb;
