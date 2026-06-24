import { handleJWT } from '#lib/server/auth/handle.ts';
import { createRedirectUrl } from '#lib/server/auth/redirect.ts';
import { captureMessage, handleErrorWithSentry, sentryHandle } from '@sentry/sveltekit';
import { redirect, type HandleValidationError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import '@valibot/i18n/ko';
import * as valibot from 'valibot';

valibot.setGlobalConfig({ lang: 'ko' });

export const handle = sequence(
	sentryHandle(), //
	handleJWT,
	({ event, resolve }) => {
		if (
			event.locals.session &&
			!event.locals.session.profile &&
			event.url.pathname !== '/profile/new'
		) {
			redirect(303, createRedirectUrl('/profile/new'));
		}

		return resolve(event, {
			preload: ({ type }) => type === 'js' || type === 'css' || type === 'font',
		});
	},
);

export const handleError = handleErrorWithSentry();

export const handleValidationError: HandleValidationError = ({ event, issues }) => {
	captureMessage('Validation Error', { extra: { event, issues } });
	return { message: 'Bad Request' };
};
