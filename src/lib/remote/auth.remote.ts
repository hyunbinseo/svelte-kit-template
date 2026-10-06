import { resolve } from '$app/paths';
import { form, getRequestEvent, query } from '$app/server';
import { invalid, redirect } from '@sveltejs/kit';
import { check, fallback, parse, pipe } from 'valibot';
import { LOGIN_REDIRECT } from '#lib/auth/config.svelte.ts';
import { AUTH_REDIRECT_PARAM } from '#lib/auth/config.ts';
import {
	type SendErrorCode,
	SendCodeSchema,
	sendErrors,
	SetupProfileSchema,
	type ValidateErrorCode,
	ValidateCodeSchema,
	validateErrors,
} from '#lib/schemas/auth.ts';
import { InternalAbsolutePathSchema } from '#lib/valibot.ts';
import { getApp } from '#server/app.ts';
import {
	applySessionChange,
	clientAddress,
	requireLoggedOut,
	requireOnboarded,
	requireSession,
	revokeSession,
	storeSession,
	throwFailure,
} from '#server/request.ts';

const getLoginDestination = () => {
	const { url } = getRequestEvent();

	return parse(
		fallback(
			pipe(
				InternalAbsolutePathSchema,
				check((v) => new URL(v, url).pathname !== resolve('login')),
			),
			LOGIN_REDIRECT,
		),
		url.searchParams.get(AUTH_REDIRECT_PARAM),
	);
};

export const getCurrentUser = query(() => {
	const session = requireOnboarded();
	return getApp()
		.accounts.current(session.sub)
		.match((user) => user, throwFailure);
});

export const sendCode = form(SendCodeSchema, (data, issue) => {
	requireLoggedOut();

	return getApp()
		.sendCode(data.contact, clientAddress())
		.match(
			(login) => login,
			(failure) =>
				failure.code
					? invalid(issue.contact(sendErrors[failure.code as SendErrorCode]))
					: throwFailure(failure),
		);
});

export const validateCode = form(ValidateCodeSchema, (data, issue) => {
	requireLoggedOut();

	return getApp()
		.validateCode(data, clientAddress())
		.match(
			(issued) => {
				storeSession(issued);
				return redirect(303, getLoginDestination());
			},
			(failure) => {
				if (failure.code === 'CODE_INVALID') invalid(issue.code(validateErrors.CODE_INVALID));
				if (failure.code) return { errorCode: failure.code as ValidateErrorCode };
				return throwFailure(failure);
			},
		);
});

export const setupProfile = form(SetupProfileSchema, async (data) => {
	const session = requireSession();
	if (session.profile) redirect(303, LOGIN_REDIRECT);

	const rotated = await getApp().setupProfile(session, data.birth, clientAddress());
	if (rotated === 'cleared') applySessionChange({ cleared: true });
	else if (rotated !== 'unchanged') storeSession(rotated);

	redirect(303, LOGIN_REDIRECT);
});

export const logout = form(() => {
	revokeSession('logout');
	redirect(303, resolve('/'));
});
