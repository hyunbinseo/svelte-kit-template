import { JWT_SECRET_NEW, JWT_SECRET_OLD } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { captureException, logger } from '@sentry/sveltekit';
import { jwtVerify, SignJWT } from 'jose';
import { JOSEError, JWSSignatureVerificationFailed, JWTExpired } from 'jose/errors';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_ALGORITHM, AUTH_TOKEN_ROTATE_GRACE } from '#auth/config.ts';
import type { TokenRefreshReason } from '#auth/enums.ts';
import type { UserRole } from '#lib/enums/user.ts';
import { claimTokenRotation, findActiveUser, insertToken } from './server.ts';

const encoder = new TextEncoder();

const SECRET_NEW = encoder.encode(JWT_SECRET_NEW);
const SECRET_OLD = JWT_SECRET_OLD ? encoder.encode(JWT_SECRET_OLD) : undefined;

// Optional claims are omitted to save bytes.
type PrivateClaims = {
	profile?: null;
	roles?: [UserRole, ...UserRole[]];
};

type ReservedClaims = {
	jti: string; // JWT ID
	sub: string; // Subject
	exp: number; // Expiration Time
	iat: number; // Issued At
};

export type Payload = PrivateClaims & ReservedClaims;

type TokenInput = Pick<
	NonNullable<App.Locals['session']>,
	| 'sub' //
	| 'profile'
	| 'roles'
> &
	(
		| {
				refreshedFrom: string;
				refreshReason: TokenRefreshReason;
		  }
		| {
				refreshedFrom?: never;
				refreshReason?: never;
		  }
	);

// BLOCKED Use transaction for atomic ban + token issuing.
export const issueToken = async (input: TokenInput) => {
	const event = getRequestEvent();

	const token = insertToken({
		userId: input.sub,
		refreshedFrom: input.refreshedFrom,
		refreshReason: input.refreshReason,
		ip: event.getClientAddress(),
	});

	const roles = input.roles.size
		? (Array.from(input.roles) as [UserRole, ...UserRole[]])
		: undefined;

	const privateClaims: PrivateClaims = {
		...(roles && { roles }),
		...(!input.profile && { profile: null }),
	};

	const jwt = await new SignJWT(privateClaims)
		.setProtectedHeader({ alg: AUTH_TOKEN_ALGORITHM })
		// Must match the ReservedClaims type.
		.setJti(token.id)
		.setSubject(input.sub)
		.setExpirationTime(token.expiresAt)
		.setIssuedAt(token.issuedAt)
		.sign(SECRET_NEW);

	event.cookies.set(AUTH_COOKIE_NAME, jwt, { expires: token.expiresAt });

	event.locals.session = {
		jti: token.id,
		sub: input.sub,
		profile: input.profile,
		roles: input.roles,
	};
};

export const rotateToken = async (
	session: Pick<NonNullable<App.Locals['session']>, 'jti' | 'sub'>,
	reason: TokenRefreshReason,
) => {
	const event = getRequestEvent();

	if (reason !== 'stale') {
		const claimed = claimTokenRotation({
			tokenId: session.jti,
			userId: session.sub,
			ip: event.getClientAddress(),
			effectiveAt: new Date(Date.now() + AUTH_TOKEN_ROTATE_GRACE),
		});
		if (!claimed) return;
	}

	const user = findActiveUser(session.sub);

	if (!user) {
		event.cookies.delete(AUTH_COOKIE_NAME);
		delete event.locals.session;
		return;
	}

	await issueToken({
		sub: session.sub,
		profile: !!user.profile,
		roles: new Set(user.activeRoles.map((r) => r.role)),
		refreshedFrom: session.jti,
		refreshReason: reason,
	});
};

const verifyWithSecretFallback = async (jwt: string) => {
	try {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	} catch (e) {
		if (!SECRET_OLD || !(e instanceof JWSSignatureVerificationFailed)) throw e;
		return await jwtVerify<Payload>(jwt, SECRET_OLD);
	}
};

export const verifyToken = async (jwt: string) => {
	try {
		return await verifyWithSecretFallback(jwt);
	} catch (e) {
		if (e instanceof JWTExpired) return undefined;
		if (e instanceof JOSEError) logger.warn('Invalid JWT', { 'error.type': e.code });
		else captureException(e);
		return undefined;
	}
};
