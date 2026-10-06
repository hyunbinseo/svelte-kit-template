import { getRequestEvent, query } from '$app/server';

export const isLoggedIn = query(() => {
	const event = getRequestEvent();
	return !!event.locals.session;
});
