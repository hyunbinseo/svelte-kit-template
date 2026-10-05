import { revokeSession } from '#auth/server/session.ts';

export const POST = ({ url }) => {
	revokeSession('logout');
	return new Response(null, {
		status: 303,
		headers: {
			'Clear-Site-Data': '"cache", "cookies", "storage"',
			'Location': url.origin,
		},
	});
};
