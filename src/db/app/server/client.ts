import { parse } from 'valibot';
import { createDatabase } from '#db/app/server/database.ts';
import { openDatabase, prepareDatabaseFile } from '#db/shared.server.ts';
import { ModeSchema } from '#lib/env.ts';
import { building, dev } from '$app/env';
import { DATA_DIR } from '$app/env/private';

const client = openDatabase(
	building
		? ':memory:'
		: prepareDatabaseFile(DATA_DIR, parse(ModeSchema, import.meta.env.MODE), 'app'),
);

// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
if (!dev) process.on('sveltekit:shutdown', () => client.close());

export const db = createDatabase(client);
