import type { NodeSQLiteDatabase, NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
import type { relations } from './relations.ts';

export type AppDb = NodeSQLiteDatabase<typeof relations>;
export type AppTx = NodeSQLiteTransaction<typeof relations>;
