import { captureMessage, handleErrorWithSentry, sentryHandle, setUser } from '@sentry/sveltekit';
import { getDotPath } from '@standard-schema/utils';
import { type Handle, type HandleServerError, sequence } from '@sveltejs/kit/hooks';
import { handleSession } from '#lib/server/auth/session.ts';

export const handle: Handle = sequence(sentryHandle(), ({ event, resolve }) => {
	handleSession(event);

	// Scoped to the request by sentryHandle
	const { session } = event.locals;
	if (session) setUser({ id: session.userId });

	return resolve(event);
});

// Sentry captures unknown errors and 5xx, then this logs like SvelteKit's default,
// except validation errors.
export const handleError = handleErrorWithSentry<HandleServerError>((input) => {
	if (input.kind === 'unknown') console.error(input.error);
	if (input.kind !== 'validation') return;

	// Paths only: messages and inputs can hold submitted values.
	const paths = input.issues.map(getDotPath);
	console.warn('Remote function validation failed:', paths);
	captureMessage('Remote function validation failed', { extra: { paths }, level: 'warning' });
});
