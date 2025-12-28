import { dev } from '$app/environment';
import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { PUBLIC_LOGIN_REDIRECT } from '$env/static/public';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_EXPIRES_IN, JWT_ALGORITHM } from '$lib/config';
import { redirect } from '@sveltejs/kit';
import { jwtVerify, SignJWT } from 'jose';
import { minLength, optional, parse, pipe, string, transform } from 'valibot';

const SecretSchema = pipe(
	string(),
	minLength(1),
	transform((value) => new TextEncoder().encode(value)),
);

const SECRET_NEW = parse(SecretSchema, env.JWT_SECRET_NEW);
const SECRET_OLD = parse(optional(SecretSchema), env.JWT_SECRET_OLD);

export type PayloadInput = {
	sub: string; // Subject
};

export type Payload = PayloadInput & {
	jti: string; // JWT ID
	iat: number; // Issued At
	exp: number; // Expiration Time
};

export const authenticate = async (_input: PayloadInput) => {
	const expiresAt = new Date(Date.now() + AUTH_TOKEN_EXPIRES_IN);
	const input: PayloadInput = { sub: _input.sub };

	const jwt = await new SignJWT(input)
		.setProtectedHeader({ alg: JWT_ALGORITHM })
		.setJti(crypto.randomUUID())
		.setIssuedAt()
		.setExpirationTime(expiresAt)
		.sign(SECRET_NEW);

	const event = getRequestEvent();

	event.cookies.set(AUTH_COOKIE_NAME, jwt, {
		path: '/',
		expires: expiresAt,
		// See https://github.com/sveltejs/kit/issues/10438
		secure: !dev || event.url.protocol === 'https:',
	});

	event.locals.session = input;

	redirect(307, PUBLIC_LOGIN_REDIRECT);
};

export const verifyJWT = async (jwt: string) => {
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
