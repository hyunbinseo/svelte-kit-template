import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { requireSession } from '#auth/server/session.ts';
import { rotateToken } from '#auth/server/token.ts';
import { db } from '#database/app/client.ts';
import { userProfileTable } from '#database/app/schema.ts';
import { SetupProfileSchema } from './shared.ts';

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
