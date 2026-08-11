import { resolve } from '$app/paths';
import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { revokeSession } from '#lib/server/auth/session.ts';

export const logout = form(() => {
	revokeSession('logout');
	redirect(303, resolve('/'));
});
