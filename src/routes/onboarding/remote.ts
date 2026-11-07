import { redirect } from '@sveltejs/kit';
import { db } from '#db/app/client.ts';
import { onboardUser } from '#db/app/user/procedures.ts';
import { parseReturnTo } from '#lib/auth/return-to.ts';
import { requireNotOnboarded } from '#lib/server/auth/session.ts';
import { OnboardSchema } from '#routes/onboarding/shared.ts';
import { resolve } from '$app/paths';
import { form } from '$app/server';

export const onboard = form(OnboardSchema, ({ birthDate, returnTo }) => {
	const session = requireNotOnboarded();

	// Ignores user_already_onboarded, e.g. from another tab
	onboardUser(db, { birthDate, userId: session.userId });

	redirect(303, parseReturnTo(returnTo) ?? resolve('/'));
});
