import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { AUTH_COOKIE_NAME } from '$lib/config';
import { redirect } from '@sveltejs/kit';

export const logout = form(() => {
	try {
		const event = getRequestEvent();
		if (!event.locals.session) return;
		event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
		delete event.locals.session;
	} finally {
		redirect(303, resolve('/login'));
	}
});
