import type { AnyRelations } from 'drizzle-orm';
import type { drizzle, NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';

// Drizzle's client, with transactions restricted, see specs/06-query-layer.md
export type DrizzleDb<TRelations extends AnyRelations> = Omit<
	ReturnType<typeof drizzle<TRelations>>,
	'transaction'
> & {
	// Immediate, so read-then-write paths can't be interleaved by another writer.
	// Sync only: node:sqlite would commit an async callback at its first await.
	transaction: <T>(
		callback: (tx: DrizzleTx<TRelations>) => T extends PromiseLike<unknown> ? never : T,
		config: { behavior: 'immediate' },
	) => T;
};

// No savepoints (nested transactions): code given a tx runs its statements in it.
export type DrizzleTx<TRelations extends AnyRelations> = Omit<
	NodeSQLiteTransaction<TRelations>,
	'transaction'
>;
