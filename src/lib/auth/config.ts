import { MINUTE, WEEK } from '#lib/time.ts';

export const AUTH_ALLOW_UNREGISTERED = true;

export const AUTH_CODE_EXPIRES_IN = 3 * MINUTE;
export const AUTH_CODE_LENGTH = 6;
export const AUTH_CODE_MAX_ATTEMPTS = 2;

export const AUTH_COOKIE_NAME = 'auth_token';
export const AUTH_REDIRECT_PARAM = 'returnTo';

export const AUTH_TOKEN_ALGORITHM = 'HS256';
export const AUTH_TOKEN_EXPIRES_IN = 3 * WEEK;
export const AUTH_TOKEN_ROTATE_GRACE = 1 * MINUTE;
export const AUTH_TOKEN_ROTATE_THRESHOLD = 1 * WEEK;
