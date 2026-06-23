export const SITE_NAME = '사이트명'; // TODO

export const ALLOW_UNREGISTERED = true;
export const LOG_SELECT_QUERIES = false;

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export const AUTH_CODE_EXPIRES_IN = 3 * MINUTE;
export const AUTH_CODE_LENGTH = 6;
export const AUTH_CODE_MAX_ATTEMPTS = 2;

export const AUTH_COOKIE_NAME = 'auth_token';

export const AUTH_TOKEN_ALGORITHM = 'HS256';
export const AUTH_TOKEN_EXPIRES_IN = 3 * WEEK;
export const AUTH_TOKEN_ROTATE_GRACE = 1 * MINUTE;
export const AUTH_TOKEN_ROTATE_THRESHOLD = 1 * WEEK;
