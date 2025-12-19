import { form, query } from '$app/server';
import { mockDB } from '$lib/server/db';
import { invalid } from '@sveltejs/kit';
import { PublicAddIdSchema } from './ids';

export const getIds = query(() => mockDB.select());

// NOTE A separate private schema can be used (e.g. verifying JWT)
export const addId = form(PublicAddIdSchema, async (data, issue) => {
	const delay = Math.round(500 * (1 + Math.random()));
	await new Promise((resolve) => setTimeout(resolve, delay));

	if (mockDB.select().has(data.uuid)) {
		invalid(issue.uuid('Existing UUID'));
	}

	mockDB.insert(data.uuid);
	await getIds().refresh();
});
