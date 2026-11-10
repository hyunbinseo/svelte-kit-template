import { getRequestEvent, query } from '$app/server';

// For the prerendered home page, which can't read the session while rendering
export const getIsLoggedIn = query(() => !!getRequestEvent().locals.session);
