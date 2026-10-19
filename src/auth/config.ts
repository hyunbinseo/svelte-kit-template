import { DAY, MINUTE } from '#lib/time.ts';

export const AUTH_ALLOW_UNREGISTERED = true;

export const AUTH_CODE_EXPIRES_IN = 3 * MINUTE;
export const AUTH_CODE_LENGTH = 6;
export const AUTH_CODE_MAX_ATTEMPTS = 2;

export const AUTH_COOKIE_NAME = 'auth_session';
export const AUTH_REDIRECT_PARAM = 'returnTo';

export const AUTH_SESSION_EXPIRES_IN = 30 * DAY;
export const AUTH_SESSION_REFRESH_THRESHOLD = 15 * DAY;
