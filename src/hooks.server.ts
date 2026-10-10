import * as Sentry from '@sentry/sveltekit';
import { getDotPath } from '@standard-schema/utils';
import { type HandleServerError, sequence } from '@sveltejs/kit/hooks';
import { handleJWT } from '#auth/server/handle.ts';

export const handle = sequence(
	Sentry.sentryHandle(), //
	handleJWT,
	({ event, resolve }) =>
		resolve(event, {
			preload: ({ type }) => type === 'js' || type === 'css' || type === 'font',
		}),
);

const sentryHandleError = Sentry.handleErrorWithSentry<HandleServerError>();

export const handleError: HandleServerError = (input) => {
	if (input.kind === 'validation') {
		const { event, issues } = input;
		Sentry.logger.warn('Validation Error', {
			'event.request.url.pathname': new URL(event.request.url).pathname,
			'event.route.id': event.route.id,
			'event.url.pathname': event.url.pathname,
			'validation.issues.paths': issues.map((issue) => getDotPath(issue) ?? '(root)').join(', '),
		});
		return;
	}

	return sentryHandleError(input);
};
