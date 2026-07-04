import { AUTH_COOKIE_NAME, AUTH_TOKEN_ALGORITHM, AUTH_TOKEN_ROTATE_GRACE } from '#lib/config.ts';
import { tokenBanTable, tokenTable } from '#lib/database/schema.ts';
import type { TokenRefreshReason, UserRole } from '#lib/enums.ts';
import { dev } from '$app/env';
import { JWT_SECRET_NEW, JWT_SECRET_OLD } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { jwtVerify, SignJWT } from 'jose';
import { JWSSignatureVerificationFailed, JWTExpired } from 'jose/errors';
import { db } from '../database/client.ts';

const encoder = new TextEncoder();

const SECRET_NEW = encoder.encode(JWT_SECRET_NEW);
const SECRET_OLD = JWT_SECRET_OLD ? encoder.encode(JWT_SECRET_OLD) : undefined;

// NOTE Optional claims are omitted to save bytes
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

// BLOCKED Use transaction for atomic ban + token issuing
export const issueToken = async (input: TokenInput) => {
	const event = getRequestEvent();

	const inserted = await db
		.insert(tokenTable)
		.values({
			userId: input.sub,
			refreshedFrom: input.refreshedFrom,
			refreshReason: input.refreshReason,
			ip: event.getClientAddress(),
		})
		.onConflictDoNothing()
		.returning({
			id: tokenTable.id,
			issuedAt: tokenTable.issuedAt,
			expiresAt: tokenTable.expiresAt,
		});

	if (!inserted.length) return;

	const token = inserted[0]!;

	const roles = input.roles.size
		? (Array.from(input.roles) as [UserRole, ...UserRole[]])
		: undefined;

	const privateClaims: PrivateClaims = {
		...(roles && { roles }),
		...(!input.profile && { profile: null }),
	};

	const jwt = await new SignJWT(privateClaims)
		.setProtectedHeader({ alg: AUTH_TOKEN_ALGORITHM })
		// NOTE Must match the ReservedClaims type
		.setJti(token.id)
		.setSubject(input.sub)
		.setExpirationTime(token.expiresAt)
		.setIssuedAt(token.issuedAt)
		.sign(SECRET_NEW);

	event.cookies.set(AUTH_COOKIE_NAME, jwt, {
		path: '/',
		expires: token.expiresAt,
		// See https://github.com/sveltejs/kit/issues/10438
		secure: !dev || event.url.protocol === 'https:',
	});

	event.locals.session = {
		jti: token.id,
		sub: input.sub,
		profile: input.profile,
		roles: input.roles,
	};
};

export const rotateToken = async (
	reason: Exclude<TokenRefreshReason, 'stale'>,
	override?: Partial<Pick<TokenInput, 'sub' | 'profile' | 'roles'>>,
) => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	const claimed = await db
		.insert(tokenBanTable)
		.values({
			tokenId: event.locals.session.jti,
			reason: 'rotate',
			effectiveAt: new Date(Date.now() + AUTH_TOKEN_ROTATE_GRACE),
			bannedBy: event.locals.session.sub,
			ip: event.getClientAddress(),
		})
		.onConflictDoNothing()
		.returning({ tokenId: tokenBanTable.tokenId });

	if (!claimed.length) return;

	await issueToken({
		...event.locals.session,
		refreshedFrom: event.locals.session.jti,
		refreshReason: reason,
		...override,
	});
};

const onJwtError = (e: unknown) => {
	if (!(e instanceof JWTExpired)) captureException(e);
	return null;
};

export const verifyToken = (jwt: string) =>
	jwtVerify<Payload>(jwt, SECRET_NEW).catch((e) =>
		e instanceof JWSSignatureVerificationFailed && SECRET_OLD
			? jwtVerify<Payload>(jwt, SECRET_OLD).catch(onJwtError)
			: onJwtError(e),
	);
