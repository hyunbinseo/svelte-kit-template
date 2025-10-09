import { form, query } from '$app/server';
import { randomUUID } from 'node:crypto';
import { FormSchema } from './ids';

const db = {
	records: Array.from({ length: 10 }, (): string => randomUUID()),
	select() {
		return this.records;
	},
	insert(uuid: string) {
		this.records.push(uuid);
	},
};

export const getIds = query(() => db.select());

export const addId = form(FormSchema, async ({ uuid }) => {
	await new Promise((resolve) => setTimeout(resolve, 2000));
	db.insert(uuid);
	await getIds().refresh();
});
