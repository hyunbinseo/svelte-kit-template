const BASE = 'http://localhost';

// Same-origin absolute paths only, so a crafted link can't redirect elsewhere.
// Returns the normalized path, or undefined if rejected.
export const parseReturnTo = (value: null | string | undefined) => {
	if (!value?.startsWith('/')) return;
	// Browsers treat \ as / and strip tabs and newlines: /\x and /\t/x become //x.
	if (/[\\\p{Cc}]/u.test(value) || value.startsWith('//')) return;

	const url = new URL(value, BASE);
	if (url.origin !== BASE) return;
	if (url.pathname === '/login') return;

	return url.pathname + url.search + url.hash;
};
