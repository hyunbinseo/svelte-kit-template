import { dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_REFRESH_DELAY, JWT_ALGORITHM } from '$lib/config';
import { tokenBanTable, tokenTable } from '$lib/database/schema';
import type { Role } from '$lib/enums';
import { jwtVerify, SignJWT } from 'jose';
import { JWSSignatureVerificationFailed } from 'jose/errors';
import { minLength, optional, parse, pipe, string, transform } from 'valibot';
import { db } from '../database';

const SecretSchema = pipe(
	string(),
	minLength(1),
	transform((value) => new TextEncoder().encode(value)),
);

const SECRET_NEW = parse(SecretSchema, env.JWT_SECRET_NEW);
const SECRET_OLD = parse(optional(SecretSchema), env.JWT_SECRET_OLD);

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

	const token = (await db
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
		.then(([token]) => token))!;

	const roles = input.roles.size ? (Array.from(input.roles) as [Role, ...Role[]]) : undefined;

	const privateClaims: PrivateClaims = {
		...(roles && { roles }),
	};

	const jwt = await new SignJWT(privateClaims)
		.setProtectedHeader({ alg: JWT_ALGORITHM })
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

	// MAYBE Use transaction for ban insertion + token issuing

	await db.insert(tokenBanTable).values({
		tokenId: event.locals.session.jti,
		type: 'refresh',
		effectiveAt: new Date(Date.now() + AUTH_TOKEN_REFRESH_DELAY),
		bannedBy: event.locals.session.sub,
		ip: event.getClientAddress(),
	});

	await issueToken(event.locals.session);
};

export const verifyToken = async (jwt: string) => {
	try {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	} catch (e) {
		if (e instanceof JWSSignatureVerificationFailed && SECRET_OLD) {
			return await jwtVerify<Payload>(jwt, SECRET_OLD);
		}
		throw e;
	}
};
