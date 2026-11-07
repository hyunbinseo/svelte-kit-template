import type { Handle } from '@sveltejs/kit/hooks';
import { handleSession } from '#lib/server/auth/session.ts';

export const handle: Handle = ({ event, resolve }) => {
	handleSession(event);
	return resolve(event);
};
