import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { requireNotOnboarded } from '#auth/server/session.ts';
import { defineQueries } from '#database/app/client.ts';
import * as queries from './queries.server.ts';
import { SetupProfileSchema } from './shared.ts';

const db = defineQueries(queries);

export const setupProfile = form(SetupProfileSchema, (data) => {
	const session = requireNotOnboarded();

	db.claimProfile({ id: session.userId, birth: data.birth });
	redirect(303, AUTH_LOGIN_REDIRECT);
});
