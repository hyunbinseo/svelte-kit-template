import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import type { Role } from '#lib/enums.ts';
import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';

export const requireSession = (requiredRoles?: [Role, ...Role[]], match: 'all' | 'any' = 'any') => {
	const event = getRequestEvent();

	if (!event.locals.session) {
		const url = new URL(resolve('/login'), event.url);
		url.searchParams.set('returnTo', event.url.pathname + event.url.search);
		redirect(303, url);
	}

	event.tracing.root.setAttribute('userId', event.locals.session.sub);

	if (requiredRoles) {
		const roles = event.locals.session.roles;
		if (
			(match === 'all' && !requiredRoles.every((r) => roles.has(r))) ||
			(match === 'any' && !requiredRoles.some((r) => roles.has(r)))
		) {
			error(403);
		}
	}

	return event.locals.session;
};

export const requireNoSession = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, LOGIN_REDIRECT);
};
