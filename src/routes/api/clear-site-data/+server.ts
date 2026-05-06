export const POST = ({ url }) => {
	return new Response(null, {
		status: 303,
		headers: {
			'Clear-Site-Data': '"cache", "cookies", "storage"',
			'Location': url.origin,
		},
	});
};
