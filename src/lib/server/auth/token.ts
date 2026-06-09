import { AUTH_COOKIE_NAME, AUTH_TOKEN_ALGORITHM, AUTH_TOKEN_REFRESH_GRACE } from '#lib/config.ts';
import { tokenBanTable, tokenTable } from '#lib/database/schema.ts';
import type { Role } from '#lib/enums.ts';
import { dev } from '$app/env';
import { JWT_SECRET_NEW, JWT_SECRET_OLD } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { jwtVerify, SignJWT } from 'jose';
import { JWSSignatureVerificationFailed } from 'jose/errors';
import { db } from '../database/client.ts';

const encoder = new TextEncoder();

const SECRET_NEW = encoder.encode(JWT_SECRET_NEW);
const SECRET_OLD = JWT_SECRET_OLD ? encoder.encode(JWT_SECRET_OLD) : undefined;

type PrivateClaims = { roles?: [Role, ...Role[]] };

type ReservedClaims = {
	jti: string; // JWT ID
	sub: string; // Subject
	exp: number; // Expiration Time
	iat: number; // Issued At
};

export type Payload = PrivateClaims & ReservedClaims;

export const issueToken = async (
	input: Pick<NonNullable<App.Locals['session']>, 'sub' | 'roles'>,
) => {
	const event = getRequestEvent();

	const token = (
		await db
			.insert(tokenTable)
			.values({
				userId: input.sub,
				ip: event.getClientAddress(),
			})
			.returning({
				id: tokenTable.id,
				issuedAt: tokenTable.issuedAt,
				expiresAt: tokenTable.expiresAt,
			})
	)[0]!;

	const roles = input.roles.size ? (Array.from(input.roles) as [Role, ...Role[]]) : undefined;

	const privateClaims: PrivateClaims = {
		...(roles && { roles }),
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
		roles: input.roles,
	};
};

export const refreshToken = async () => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	// BLOCKED Use transaction for ban insertion + token issuing

	await db.insert(tokenBanTable).values({
		tokenId: event.locals.session.jti,
		type: 'refresh',
		effectiveAt: new Date(Date.now() + AUTH_TOKEN_REFRESH_GRACE),
		bannedBy: event.locals.session.sub,
		ip: event.getClientAddress(),
	});

	await issueToken(event.locals.session);
};

const jwtVerifyWithFallback = async (jwt: string) => {
	try {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	} catch (e) {
		if (e instanceof JWSSignatureVerificationFailed && SECRET_OLD) {
			return await jwtVerify<Payload>(jwt, SECRET_OLD);
		}
		throw e;
	}
};

export const verifyToken = async (jwt: string) => {
	const verified = await jwtVerifyWithFallback(jwt);
	if (!dev) return verified;

	const user = await db.query.userTable.findFirst({
		where: {
			id: verified.payload.sub,
			deactivatedAt: { isNull: true },
		},
		columns: { id: true },
	});

	if (!user) throw new Error();
	return verified;
};
