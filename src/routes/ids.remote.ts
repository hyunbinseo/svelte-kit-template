import { form, query } from '$app/server';
import { mockDB } from '$lib/server/db';
import { FormSchema } from './ids';

export const getIds = query(() => mockDB.select());

export const addId = form(FormSchema, async ({ uuid }) => {
	await new Promise((resolve) => setTimeout(resolve, 500 * (1 + Math.random())));
	mockDB.insert(uuid);
	await getIds().refresh();
});
