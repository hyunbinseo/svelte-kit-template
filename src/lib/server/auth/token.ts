import { dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_EXPIRES_IN, JWT_ALGORITHM } from '$lib/config';
import { jwtVerify, SignJWT } from 'jose';
import { minLength, optional, parse, pipe, string, transform } from 'valibot';

const SecretSchema = pipe(
	string(),
	minLength(1),
	transform((value) => new TextEncoder().encode(value)),
);

const SECRET_NEW = parse(SecretSchema, env.JWT_SECRET_NEW);
const SECRET_OLD = parse(optional(SecretSchema), env.JWT_SECRET_OLD);

type PrivateClaims = Record<string, never>;

type ReservedClaims = {
	sub: string; // Subject
	exp: number; // Expiration Time
	iat: number; // Issued At
};

export type Payload = PrivateClaims & ReservedClaims;

export const issueToken = async (input: Pick<NonNullable<App.Locals['session']>, 'sub'>) => {
	const event = getRequestEvent();

	const expiresAt = new Date(Date.now() + AUTH_TOKEN_EXPIRES_IN);

	const jwt = await new SignJWT()
		.setProtectedHeader({ alg: JWT_ALGORITHM })
		// NOTE Must match the ReservedClaims type
		.setSubject(input.sub)
		.setExpirationTime(expiresAt)
		.setIssuedAt()
		.sign(SECRET_NEW);

	event.cookies.set(AUTH_COOKIE_NAME, jwt, {
		path: '/',
		expires: expiresAt,
		// See https://github.com/sveltejs/kit/issues/10438
		secure: !dev || event.url.protocol === 'https:',
	});
};

export const refreshToken = async () => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	await issueToken(event.locals.session);
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
