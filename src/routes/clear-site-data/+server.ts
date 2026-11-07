import { logout } from '#lib/server/auth/session.ts';
import { resolve } from '$app/paths';
import type { RequestHandler } from './$types.ts';

// Logs out and clears cached state, e.g. from the 5xx error page.
// POST, so SvelteKit's CSRF check blocks cross-site forms.
export const POST: RequestHandler = () => {
	logout();
	return new Response(null, {
		headers: {
			'Clear-Site-Data': '"cache", "cookies", "storage"',
			Location: resolve('/'),
		},
		status: 303,
	});
};
