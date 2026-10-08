import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { requireSession } from '#auth/server/session.ts';
import { rotateToken } from '#auth/server/token.ts';
import { insertProfile } from './server.ts';
import { SetupProfileSchema } from './shared.ts';

export const setupProfile = form(SetupProfileSchema, async (data) => {
	const session = requireSession();
	if (session.profile) redirect(303, LOGIN_REDIRECT);

	insertProfile({ id: session.sub, birth: data.birth });

	await rotateToken(session, 'profile');
	redirect(303, LOGIN_REDIRECT);
});
