import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { userProfileTable } from '#lib/database/schema.ts';
import { getRedirectUrl } from '#lib/server/auth/redirect.ts';
import { requireSession } from '#lib/server/auth/session.ts';
import { rotateToken } from '#lib/server/auth/token.ts';
import { db } from '#lib/server/database/client.ts';
import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { SetupProfileSchema } from './setup.ts';

export const setupProfile = form(SetupProfileSchema, async (data) => {
	const redirectUrl = getRedirectUrl() || LOGIN_REDIRECT;

	const session = requireSession();
	if (session.profile) redirect(303, redirectUrl);

	await db
		.insert(userProfileTable)
		.values({
			id: session.sub,
			birth: data.birth,
		})
		.onConflictDoNothing();

	await rotateToken({ profile: true });
	redirect(303, redirectUrl);
});
