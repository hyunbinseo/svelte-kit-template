import { getRequestEvent } from '$app/server';
import { LOGIN_REDIRECT_PATH } from '$lib/env';
import { error, redirect } from '@sveltejs/kit';

export const requireSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) error(401);
	return event.locals.session;
};

export const requireNoSession = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(307, LOGIN_REDIRECT_PATH);
};
