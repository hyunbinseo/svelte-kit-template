import { form, query } from '$app/server';
import { randomUUID } from 'node:crypto';
import { FormSchema } from './ids';

const sharedIds: string[] = Array.from({ length: 10 }, () => randomUUID());

export const getIds = query(() => sharedIds);

export const addId = form(FormSchema, async ({ uuid }) => {
	await new Promise((resolve) => setTimeout(resolve, 2000));
	sharedIds.push(uuid);
	await getIds().refresh();
});
