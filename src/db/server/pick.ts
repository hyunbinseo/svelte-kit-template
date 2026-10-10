const pick = <T extends object, K extends keyof T>(data: T, keys: readonly K[]) =>
	Object.fromEntries(
		keys.filter((key) => key in data).map((key) => [key, data[key]]), //
	) as Pick<T, K>;

export const picked =
	<T extends object>() =>
	<const K extends keyof T, R>(keys: readonly K[], query: (data: Pick<T, K>) => R) =>
	(data: Pick<T, K>) =>
		query(pick(data, keys));
