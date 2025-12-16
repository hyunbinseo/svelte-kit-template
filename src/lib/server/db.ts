export const mockDB = {
	records: new Set(Array.from({ length: 10 }, (): string => crypto.randomUUID())),
	select() {
		return this.records;
	},
	insert(uuid: string) {
		this.records.add(uuid);
	},
};
