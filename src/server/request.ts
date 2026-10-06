import { STATUS_CODES } from 'node:http';
import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { ok, type Result } from 'neverthrow';
import { LOGIN_REDIRECT } from '#lib/auth/config.svelte.ts';
import { AUTH_COOKIE_NAME } from '#lib/auth/config.ts';
import type { TokenRevokeReason } from '#lib/enums/token.ts';
import { getApp } from '#server/app.ts';
import type { IssuedSession, SessionChange } from '#server/domain/auth.ts';
import type { Failure } from '#server/domain/failure.ts';
import type { Viewer } from '#server/domain/viewer.ts';

export const clientAddress = () => getRequestEvent().getClientAddress();

export const requireSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) error(401);
	return event.locals.session;
};

export const requireOnboarded = () => {
	const session = requireSession();

	if (!session.profile) redirect(303, resolve('onboard'));

	return session as typeof session & { profile: true };
};

export const requireLoggedOut = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, LOGIN_REDIRECT);
};

export const currentViewer = (): Result<Viewer, Failure> => {
	const session = requireOnboarded();
	return ok({ userId: session.sub, isAdmin: session.roles.has('admin') });
};

export const storeSession = ({ jwt, expiresAt, session }: IssuedSession) => {
	const event = getRequestEvent();
	event.cookies.set(AUTH_COOKIE_NAME, jwt, { expires: expiresAt });
	event.locals.session = session;
};

export const clearSession = () => {
	const event = getRequestEvent();
	event.cookies.delete(AUTH_COOKIE_NAME);
	delete event.locals.session;
};

export const applySessionChange = (change: SessionChange) => {
	if ('cleared' in change) clearSession();
	else if ('issued' in change) storeSession(change.issued);
	else getRequestEvent().locals.session = change.session;
};

export const revokeSession = (reason: TokenRevokeReason) => {
	const { session } = getRequestEvent().locals;
	if (!session) return;

	getApp().sessions.revoke(session, reason, clientAddress());
	clearSession();
};

// Queries and commands surface failures as HTTP errors.
export const throwFailure = ({ status, message }: Failure): never => error(status, message);

// Forms surface failures as form-level issues so they render next to the form.
export const rejectForm = ({ status, message }: Failure): never =>
	invalid(message ?? STATUS_CODES[status] ?? 'Error');
