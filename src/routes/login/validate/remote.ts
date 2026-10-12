import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { invalid, redirect } from '@sveltejs/kit';
import { isAPIError } from 'better-auth/api';
import { check, fallback, parse, pipe } from 'valibot';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { AUTH_REDIRECT_PARAM } from '#auth/config.ts';
import { auth } from '#auth/server/auth.ts';
import { requireLoggedOut } from '#auth/server/session.ts';
import { InternalAbsolutePathSchema } from '#lib/valibot.ts';
import { apiErrorCodeToValidateErrorCode, validateErrorCodeToMessage } from './enums.ts';
import { ValidateCodeSchema } from './shared.ts';

const getRedirectDestination = () => {
	const { url } = getRequestEvent();

	return parse(
		fallback(
			pipe(
				InternalAbsolutePathSchema,
				check((v) => new URL(v, url).pathname !== resolve('login')),
			),
			AUTH_LOGIN_REDIRECT,
		),
		url.searchParams.get(AUTH_REDIRECT_PARAM),
	);
};

export const validateCode = form(ValidateCodeSchema, async (data, issue) => {
	requireLoggedOut();

	try {
		await auth.api.signInEmailOTP({
			body: { email: data.contact, otp: data.code },
			headers: getRequestEvent().request.headers,
		});
	} catch (error) {
		const errorCode = isAPIError(error) && apiErrorCodeToValidateErrorCode[error.body?.code ?? ''];
		if (!errorCode) throw error;

		if (errorCode === 'codeInvalid') invalid(issue.code(validateErrorCodeToMessage[errorCode]));

		return { errorCode };
	}

	redirect(303, getRedirectDestination());
});
