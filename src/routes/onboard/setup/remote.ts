import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { requireNotOnboarded } from '#auth/server/session.ts';
import { rotateToken } from '#auth/server/token.ts';
import { db } from '#database/app/client.ts';
import { userProfileTable } from '#database/app/schema.ts';
import { SetupProfileSchema } from './shared.ts';

export const setupProfile = form(SetupProfileSchema, async (data) => {
	const session = requireNotOnboarded();

	db.insert(userProfileTable)
		.values({
			id: session.sub,
			birth: data.birth,
		})
		.onConflictDoNothing()
		.run();

	await rotateToken(session, 'profile');
	redirect(303, AUTH_LOGIN_REDIRECT);
});
