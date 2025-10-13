import { form, query } from '$app/server';
import { db } from '$lib/db.server';
import { FormSchema } from './ids';

export const getIds = query(() => db.select());

export const addId = form(FormSchema, async ({ uuid }) => {
	await new Promise((resolve) => setTimeout(resolve, 2000));
	db.insert(uuid);
	await getIds().refresh();
});
