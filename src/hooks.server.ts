import { handleErrorWithSentry, logger, sentryHandle } from '@sentry/sveltekit';
import { getDotPath } from '@standard-schema/utils';
import type { HandleServerError } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { setGlobalConfig } from 'valibot';
import '@valibot/i18n/ko';
import { handleJWT } from '#lib/server/auth/handle.ts';

setGlobalConfig({ lang: 'ko' });

export const handle = sequence(
	sentryHandle(), //
	handleJWT,
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
