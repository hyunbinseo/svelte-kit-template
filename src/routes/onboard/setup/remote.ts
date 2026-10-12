import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { requireNotOnboarded } from '#auth/server/session.ts';
import { db } from './server.ts';
import { SetupProfileSchema } from './shared.ts';

export const setupProfile = form(SetupProfileSchema, (data) => {
	const session = requireNotOnboarded();

	db.claimProfile({ id: session.userId, birth: data.birth });

	redirect(303, AUTH_LOGIN_REDIRECT);
});
