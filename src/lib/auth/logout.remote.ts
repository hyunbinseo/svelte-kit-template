import { redirect } from '@sveltejs/kit';
import { logout as revokeAndClear } from '#lib/server/auth/session.ts';
import { resolve } from '$app/paths';
import { form } from '$app/server';

export const logout = form(() => {
	revokeAndClear();
	redirect(303, resolve('/'));
});
