import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { userProfileTable } from '#lib/database/schema.ts';
import { requireSession } from '#lib/server/auth/session.ts';
import { rotateToken } from '#lib/server/auth/token.ts';
import { db } from '#lib/server/database/client.ts';
import { SetupProfileSchema } from './setup.ts';

export const setupProfile = form(SetupProfileSchema, async (data) => {
	const session = requireSession();
	if (session.profile) redirect(303, LOGIN_REDIRECT);

	db.insert(userProfileTable)
		.values({
			id: session.sub,
			birth: data.birth,
		})
		.onConflictDoNothing()
		.run();

	await rotateToken(session, 'profile');
	redirect(303, LOGIN_REDIRECT);
});
