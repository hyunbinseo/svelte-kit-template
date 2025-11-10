import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { JWT_SECRET_NEW, JWT_SECRET_OLD } from '$env/static/private';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_EXPIRES_IN, JWT_ALGORITHM } from '$lib/config';
import { error, redirect } from '@sveltejs/kit';
import { jwtVerify, SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';

const SECRET_NEW = new TextEncoder().encode(JWT_SECRET_NEW);
const SECRET_OLD = new TextEncoder().encode(JWT_SECRET_OLD);

export type PayloadInput = {
	sub: string; // Subject
};

type Payload = PayloadInput & {
	jti: string; // JWT ID
	iat: number; // Issued At
	exp: number; // Expiration Time
};

export const authenticate = async (_input: PayloadInput) => {
	const expiresAt = new Date(Date.now() + AUTH_TOKEN_EXPIRES_IN);
	const input: PayloadInput = { sub: _input.sub };

	const jwt = await new SignJWT(input)
		.setProtectedHeader({ alg: JWT_ALGORITHM })
		.setJti(randomUUID())
		.setIssuedAt()
		.setExpirationTime(expiresAt)
		.sign(SECRET_NEW);

	const event = getRequestEvent();
	event.cookies.set(AUTH_COOKIE_NAME, jwt, { path: '/', expires: expiresAt });
	event.locals.session = input;

	redirect(307, resolve('/')); // NOTE Update as needed
};

export const verifyJWT = async (jwt: string) => {
	try {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	} catch {
		return await jwtVerify<Payload>(jwt, SECRET_OLD);
	}
};

export const getSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) error(401);
	return event.locals.session;
};
