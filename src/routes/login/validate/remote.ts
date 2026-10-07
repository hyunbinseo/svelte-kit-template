import { form } from '$app/server';
import { invalid, redirect } from '@sveltejs/kit';
import { requireLoggedOut } from '#auth/server/session.ts';
import { issueToken } from '#auth/server/token.ts';
import { getRedirectDestination, verifyLogin } from './server.ts';
import { validateErrors, ValidateCodeSchema } from './shared.ts';

export const validateCode = form(ValidateCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const result = verifyLogin(data);

	if (result.errorCode === 'CODE_INVALID') {
		invalid(issue.code(validateErrors[result.errorCode]));
	}

	if (result.errorCode) return result;

	await issueToken({
		sub: result.user.id,
		roles: new Set(result.user.activeRoles.map((row) => row.role)),
		profile: !!result.user.profile,
	});

	redirect(303, getRedirectDestination());
});
