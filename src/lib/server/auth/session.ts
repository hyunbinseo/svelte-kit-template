import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { LOGIN_REDIRECT_PATH } from '$lib/env';
import { redirect } from '@sveltejs/kit';

export const requireSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) {
		const url = new URL(resolve('/login'), event.url);
		url.searchParams.set('returnTo', event.url.pathname + event.url.search);
		redirect(307, url);
	}
	return event.locals.session;
};

export const requireNoSession = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(307, LOGIN_REDIRECT_PATH);
};
