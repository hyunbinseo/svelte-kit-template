import type { ResolvedPathname } from '$app/types';
import type { RequestEvent } from '@sveltejs/kit';

// NOTE Request event's `url` relate to the page the remote function was called from

const NAME = 'returnTo';

export const createRedirectUrl = (pathname: ResolvedPathname, event: RequestEvent) => {
	const url = new URL(pathname, event.url);
	url.search = '';
	url.searchParams.set(NAME, event.url.pathname + event.url.search);
	return url;
};

export const getRedirectUrl = (event: RequestEvent) => {
	const returnTo = event.url.searchParams.get(NAME);
	if (!returnTo) return;

	const url = new URL(returnTo, event.url);

	// e.g. new URL('//evil.com', 'https://example.com')
	if (url.origin !== event.url.origin) return;
	if (url.pathname === event.url.pathname) return;

	return url;
};
