export const JWT_ALGORITHM = 'HS256';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export const AUTH_COOKIE_NAME = 'auth_token';
export const AUTH_TOKEN_EXPIRES_IN = 3 * WEEK;
export const AUTH_TOKEN_REFRESH_FROM = 1 * WEEK;
export const AUTH_TOKEN_REFRESH_DELAY = 1 * MINUTE;
