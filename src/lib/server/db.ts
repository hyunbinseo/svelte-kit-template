export const mockDB = {
	records: Array.from({ length: 10 }, (): string => crypto.randomUUID()),
	select() {
		return this.records;
	},
	insert(uuid: string) {
		this.records.push(uuid);
	},
};
