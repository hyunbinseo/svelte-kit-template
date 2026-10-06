import { db } from '#database/client.ts';

export type Database = typeof db;
export type Executor = Pick<Database, 'insert' | 'update' | 'delete' | 'query'>;
