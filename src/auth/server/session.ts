import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { auth } from './auth.ts';

export const requireSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) error(401);
	return event.locals.session;
};

export const requireOnboarded = () => {
	const session = requireSession();
	if (!session.profile) redirect(303, resolve('onboard'));
	return session as typeof session & { profile: true };
};

export const requireNotOnboarded = () => {
	const session = requireSession();
	if (session.profile) redirect(303, AUTH_LOGIN_REDIRECT);
	return session as typeof session & { profile: false };
};

export const requireLoggedOut = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, AUTH_LOGIN_REDIRECT);
};

export const revokeSession = async () => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	await auth.api.signOut({ headers: event.request.headers });

	delete event.locals.session;
};
