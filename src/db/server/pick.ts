const pick = <T extends object, K extends keyof T>(data: T, keys: readonly K[]) =>
	Object.fromEntries(
		keys
			.filter((key) => {
				if (Object.hasOwn(data, key)) return true;
				if (key in data) throw new TypeError(`Cannot pick inherited key: ${String(key)}`);
				return false;
			})
			.map((key) => [key, data[key]]),
	) as Pick<T, K>;

export const picked =
	<T extends object>() =>
	<const K extends keyof T, R>(
		keys: readonly K[], //
		query: (data: Pick<T, K>) => R,
	) => {
		return (data: Pick<T, K>) => query(pick(data, keys));
	};
