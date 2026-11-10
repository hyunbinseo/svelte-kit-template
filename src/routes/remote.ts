import { getRequestEvent, query } from '$app/server';

// Read client-side: the prerendered home page can't read the session while rendering,
// and Sentry tags client events with it.
export const getSessionUserId = query(() => getRequestEvent().locals.session?.userId ?? null);
