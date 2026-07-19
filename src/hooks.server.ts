import { handleJWT } from '#lib/server/auth/handle.ts';
import { captureMessage, handleErrorWithSentry, sentryHandle } from '@sentry/sveltekit';
import type { HandleValidationError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import '@valibot/i18n/ko';
import * as valibot from 'valibot';

valibot.setGlobalConfig({ lang: 'ko' });

export const handle = sequence(
	sentryHandle(), //
	handleJWT,
	({ event, resolve }) => {
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
