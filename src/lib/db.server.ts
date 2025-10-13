import { randomUUID } from 'node:crypto';

export const db = {
	records: Array.from({ length: 10 }, (): string => randomUUID()),
	select() {
		return this.records;
	},
	insert(uuid: string) {
		this.records.push(uuid);
	},
};
