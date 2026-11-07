import { LOGIN_CODE_LIFETIME_MS } from '#lib/auth/config.ts';
import { formatToken, parseToken } from '#lib/server/auth/token.ts';
import { getRequestEvent } from '$app/server';

// Binds a pending login to the browser that requested it, see specs/08-auth.md
const LOGIN_COOKIE = 'login';

export const getLoginCookie = () => parseToken(getRequestEvent().cookies.get(LOGIN_COOKIE));

export const setLoginCookie = (loginId: number, secret: Buffer) => {
	getRequestEvent().cookies.set(LOGIN_COOKIE, formatToken(loginId, secret), {
		httpOnly: true,
		maxAge: LOGIN_CODE_LIFETIME_MS / 1000,
		path: '/',
		sameSite: 'lax',
	});
};

export const deleteLoginCookie = () => {
	getRequestEvent().cookies.delete(LOGIN_COOKIE, { path: '/' });
};
