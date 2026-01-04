import { dev } from '$app/environment';
import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_REFRESH_DELAY, JWT_ALGORITHM } from '$lib/config';
import { redirect } from '@sveltejs/kit';
import { jwtVerify, SignJWT } from 'jose';
import { minLength, optional, parse, pipe, string, transform } from 'valibot';
import { db } from './db';
import { tokenBanTable, tokenTable } from './db/schema';

const SecretSchema = pipe(
	string(),
	minLength(1),
	transform((value) => new TextEncoder().encode(value)),
);

const SECRET_NEW = parse(SecretSchema, env.JWT_SECRET_NEW);
const SECRET_OLD = parse(optional(SecretSchema), env.JWT_SECRET_OLD);

type PrivateClaims = Record<never, never>;

type ReservedClaims = {
	jti: string; // JWT ID
	sub: string; // Subject
	exp: number; // Expiration Time
	iat: number; // Issued At
};

export type Payload = PrivateClaims & ReservedClaims;

export const issueToken = async (input: { userId: string }) => {
	const event = getRequestEvent();

	const token = (await db
		.insert(tokenTable)
		.values({
			userId: input.userId,
			ip: event.getClientAddress(),
		})
		.returning({
			id: tokenTable.id,
			issuedAt: tokenTable.issuedAt,
			expiresAt: tokenTable.expiresAt,
		})
		.then(([token]) => token))!;

	const privateClaims: PrivateClaims = {};

	const jwt = await new SignJWT(privateClaims)
		.setProtectedHeader({ alg: JWT_ALGORITHM })
		// NOTE Must match the ReservedClaims type
		.setJti(token.id)
		.setSubject(input.userId)
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
		sub: input.userId,
	};
};

export const refreshToken = async () => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	await db.insert(tokenBanTable).values({
		tokenId: event.locals.session.jti,
		type: 'refresh',
		effectiveAt: new Date(Date.now() + AUTH_TOKEN_REFRESH_DELAY),
		ip: event.getClientAddress(),
	});

	await issueToken({ userId: event.locals.session.sub });
};

export const verifyToken = async (jwt: string) => {
	if (!SECRET_OLD) {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	}
	try {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	} catch {
		return await jwtVerify<Payload>(jwt, SECRET_OLD);
	}
};

export const getSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) redirect(307, resolve('/login'));
	return event.locals.session;
};
