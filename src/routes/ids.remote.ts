import { form, query } from '$app/server';
import { mockDB } from '$lib/server/db';
import { check, object, pipe, string, uuid } from 'valibot';

export const getIds = query(() => mockDB.select());

const AddIdSchema = object({
	uuid: pipe(
		string(),
		uuid(),
		check((uuid) => !mockDB.select().has(uuid), 'Existing UUID'),
	),
});

export const addId = form(AddIdSchema, async ({ uuid }) => {
	await new Promise((resolve) => setTimeout(resolve, 500 * (1 + Math.random())));
	mockDB.insert(uuid);
	await getIds().refresh();
});
