import { getRequestEvent } from '$app/server';
import type { ResolvedPathname } from '$app/types';

// Don't call `event.url`-based helpers in form actions.

const REDIRECT_PARAM = 'returnTo';

export const createRedirectUrl = (pathname: ResolvedPathname) => {
	const event = getRequestEvent();
	const url = new URL(pathname, event.url);
	url.search = '';
	url.searchParams.set(REDIRECT_PARAM, event.url.pathname + event.url.search);
	return url;
};

export const getRedirectUrl = () => {
	const event = getRequestEvent();
	const destination = event.url.searchParams.get(REDIRECT_PARAM);
	if (!destination) return;

	const url = new URL(destination, event.url);

	// e.g. new URL('//evil.com', 'https://example.com')
	if (url.origin !== event.url.origin) return;
	if (url.pathname === event.url.pathname) return;

	return url;
};
