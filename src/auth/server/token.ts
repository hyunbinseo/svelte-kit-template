import { JWT_SECRET_NEW, JWT_SECRET_OLD } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { captureException, logger } from '@sentry/sveltekit';
import { jwtVerify, SignJWT } from 'jose';
import { JOSEError, JWSSignatureVerificationFailed, JWTExpired } from 'jose/errors';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_ALGORITHM, AUTH_TOKEN_ROTATE_GRACE } from '#auth/config.ts';
import type { TokenRefreshReason } from '#auth/enums.ts';
import { db } from '#database/app/client.ts';
import { tokenBanTable, tokenTable } from '#database/app/schema.ts';
import type { AppTx } from '#database/app/types.ts';
import type { UserRole } from '#lib/enums/user.ts';

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

type IssuedToken = Pick<NonNullable<App.Locals['session']>, 'sub' | 'profile' | 'roles'> & {
	id: string;
	issuedAt: Date;
	expiresAt: Date;
};

export const issueToken = (tx: AppTx, input: TokenInput): IssuedToken => {
	const token = tx
		.insert(tokenTable)
		.values({
			userId: input.sub,
			refreshedFrom: input.refreshedFrom,
			refreshReason: input.refreshReason,
			ip: getRequestEvent().getClientAddress(),
		})
		// Returns existing row.
		.onConflictDoUpdate({
			target: tokenTable.refreshedFrom,
			set: { userId: tokenTable.userId },
		})
		.returning({
			id: tokenTable.id,
			issuedAt: tokenTable.issuedAt,
			expiresAt: tokenTable.expiresAt,
		})
		.all()[0]!;

	return { ...token, sub: input.sub, profile: input.profile, roles: input.roles };
};

export const signToken = async (token: IssuedToken) => {
	const event = getRequestEvent();

	const roles = token.roles.size
		? (Array.from(token.roles) as [UserRole, ...UserRole[]])
		: undefined;

	const privateClaims: PrivateClaims = {
		...(roles && { roles }),
		...(!token.profile && { profile: null }),
	};

	const jwt = await new SignJWT(privateClaims)
		.setProtectedHeader({ alg: AUTH_TOKEN_ALGORITHM })
		// Must match the ReservedClaims type.
		.setJti(token.id)
		.setSubject(token.sub)
		.setExpirationTime(token.expiresAt)
		.setIssuedAt(token.issuedAt)
		.sign(SECRET_NEW);

	event.cookies.set(AUTH_COOKIE_NAME, jwt, { expires: token.expiresAt });

	event.locals.session = {
		jti: token.id,
		sub: token.sub,
		profile: token.profile,
		roles: token.roles,
	};
};

export const rotateToken = async (
	session: Pick<NonNullable<App.Locals['session']>, 'jti' | 'sub'>,
	reason: TokenRefreshReason,
) => {
	const event = getRequestEvent();

	const token = db.transaction(
		(tx) => {
			if (reason !== 'stale') {
				tx.insert(tokenBanTable)
					.values({
						tokenId: session.jti,
						reason: 'rotate',
						effectiveAt: new Date(Date.now() + AUTH_TOKEN_ROTATE_GRACE),
						bannedBy: session.sub,
						ip: event.getClientAddress(),
					})
					.onConflictDoNothing()
					.run();
			}

			const user = tx.query.userTable
				.findFirst({
					where: {
						id: session.sub,
						deactivatedAt: { isNull: true },
					},
					with: {
						profile: { columns: { id: true } },
						activeRoles: { columns: { role: true } },
					},
				})
				.sync();

			if (!user) return 'deactivated';

			return issueToken(tx, {
				sub: session.sub,
				profile: !!user.profile,
				roles: new Set(user.activeRoles.map((row) => row.role)),
				refreshedFrom: session.jti,
				refreshReason: reason,
			});
		},
		{ behavior: 'immediate' },
	);

	if (token === 'deactivated') {
		event.cookies.delete(AUTH_COOKIE_NAME);
		delete event.locals.session;
		return;
	}

	await signToken(token);
};

const verifyWithSecretFallback = async (jwt: string) => {
	try {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	} catch (error) {
		if (!SECRET_OLD || !(error instanceof JWSSignatureVerificationFailed)) throw error;
		return await jwtVerify<Payload>(jwt, SECRET_OLD);
	}
};

export const verifyToken = async (jwt: string) => {
	try {
		return await verifyWithSecretFallback(jwt);
	} catch (error) {
		if (error instanceof JWTExpired) return undefined;
		if (error instanceof JOSEError) logger.warn('Invalid JWT', { 'error.type': error.code });
		else captureException(error);
		return undefined;
	}
};
