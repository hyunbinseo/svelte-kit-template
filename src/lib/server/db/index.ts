import { DatabaseSync } from 'node:sqlite';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema.ts';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new DatabaseSync(DATABASE_URL);

export const db = drizzle({ client, relations: defineRelations(schema) });
