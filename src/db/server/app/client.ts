import { DatabaseSync } from 'node:sqlite';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { parse } from 'valibot';
// eslint-disable-next-line no-restricted-syntax
import * as schema from '#db/server/app/schema.ts';
import { prepareDatabaseFile } from '#db/server/shared.ts';
import { ModeSchema } from '#lib/env.ts';
import { building } from '$app/env';
import { DATA_DIR } from '$app/env/private';

const client = new DatabaseSync(
	building
		? ':memory:'
		: prepareDatabaseFile(DATA_DIR, parse(ModeSchema, import.meta.env.MODE), 'app'),
);

export const db = drizzle({ client, relations: defineRelations(schema) });
