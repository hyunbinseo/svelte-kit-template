import { getRequestEvent } from '$app/server';
import { PUBLIC_LOGIN_REDIRECT } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

export const checkSession = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(307, PUBLIC_LOGIN_REDIRECT);
};
