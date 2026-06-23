import { revokeSession } from '#lib/server/auth/session.ts';
import { resolve } from '$app/paths';
import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';

export const logout = form(async () => {
	await revokeSession('logout');
	redirect(303, resolve('/'));
});
