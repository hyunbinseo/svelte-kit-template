export const pick = <T extends object, K extends keyof T>(
	data: T,
	keys: readonly K[],
): Pick<T, K> => Object.fromEntries(keys.map((key) => [key, data[key]])) as Pick<T, K>;
