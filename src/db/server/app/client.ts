import { DatabaseSync } from 'node:sqlite';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import * as schema from '#db/server/app/schema.ts';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new DatabaseSync(DATABASE_URL);

export const db = drizzle({ client, relations: defineRelations(schema) });
