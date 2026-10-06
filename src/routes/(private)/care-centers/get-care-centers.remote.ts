import { query } from '$app/server';
import { requireOnboarded } from '#auth/server/session.ts';
import { findCareCenters } from '#server/care-center/service.ts';

export const getCareCenters = query(() => {
	const session = requireOnboarded();
	return findCareCenters(session.sub, session.roles.has('admin'));
});
