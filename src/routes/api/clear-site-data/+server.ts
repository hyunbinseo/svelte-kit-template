import { revokeSession } from '#lib/server/auth/session.ts';

export const POST = async ({ url }) => {
	await revokeSession();
	return new Response(null, {
		status: 303,
		headers: {
			'Clear-Site-Data': '"cache", "cookies", "storage"',
			'Location': url.origin,
		},
	});
};
