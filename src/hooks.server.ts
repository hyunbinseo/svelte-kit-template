import {
	captureException,
	handleErrorWithSentry,
	logger,
	sentryHandle,
	setUser,
} from '@sentry/sveltekit';
import { getDotPath } from '@standard-schema/utils';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { AUTH_COOKIE_NAME } from '#lib/auth/config.ts';
import { getApp } from '#server/app.ts';
import { applySessionChange } from '#server/request.ts';

const handleSession: Handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);
	if (!jwt) return resolve(event);

	const change = await getApp().sessions.authenticate(
		jwt,
		event.getClientAddress(),
		captureException,
	);
	applySessionChange(change);

	const userId = event.locals.session?.sub;
	if (userId) {
		setUser({ id: userId });
		event.tracing.root.setAttribute('userId', userId);
	}

	return resolve(event);
};

export const handle = sequence(
	sentryHandle(), //
	handleSession,
	({ event, resolve }) => {
		return resolve(event, {
			preload: ({ type }) => type === 'js' || type === 'css' || type === 'font',
		});
	},
);

const sentryHandleError = handleErrorWithSentry<HandleServerError>();

export const handleError: HandleServerError = (input) => {
	if (input.kind === 'validation') {
		const { event, issues } = input;
		logger.warn('Validation Error', {
			'event.request.url.pathname': new URL(event.request.url).pathname,
			'event.route.id': event.route.id,
			'event.url.pathname': event.url.pathname,
			'validation.issues.paths': issues.map((issue) => getDotPath(issue) ?? '(root)').join(', '),
		});
		return;
	}

	return sentryHandleError(input);
};
