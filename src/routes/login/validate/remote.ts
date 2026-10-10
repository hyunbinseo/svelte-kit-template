import { form } from '$app/server';
import { invalid, redirect } from '@sveltejs/kit';
import { requireLoggedOut } from '#auth/server/session.ts';
import { issueToken } from '#auth/server/token.ts';
import { validateErrorCodeToMessage } from './enums.ts';
import { getRedirectDestination, validateLogin } from './server.ts';
import { ValidateCodeSchema } from './shared.ts';

export const validateCode = form(ValidateCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const result = validateLogin(data);

	if (result.errorCode === 'codeInvalid') {
		invalid(issue.code(validateErrorCodeToMessage[result.errorCode]));
	}

	if (result.errorCode) return result;

	await issueToken({
		sub: result.user.id,
		roles: new Set(result.user.activeRoles.map((row) => row.role)),
		profile: !!result.user.profile,
	});

	redirect(303, getRedirectDestination());
});
