import { resolve } from '$app/paths';
import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { revokeSession } from '#auth/server/session.ts';

export const logout = form(() => {
	revokeSession('logout');
	redirect(303, resolve('/'));
});
