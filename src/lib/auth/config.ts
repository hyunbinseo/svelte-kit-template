// Importable from server and client code, so pages can show the same values.

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// Unregistered contacts get an account once they enter a correct code.
export const IS_SIGN_UP_OPEN: boolean = true;

export const LOGIN_CODE_DIGITS = 6;
export const LOGIN_CODE_LIFETIME_MS = 3 * MINUTE;
export const LOGIN_MAX_ATTEMPTS = 2;

export const SESSION_LIFETIME_MS = 30 * DAY;
export const SESSION_REFRESH_THRESHOLD_MS = 15 * DAY; // refreshed when less is left

// A banned user's contact is kept this long, so they can't sign up again.
// The purge job erases it afterwards, see specs/12-operations.md
export const BAN_BLOCK_PERIOD = { months: 6 } as const; // a Temporal.DurationLike
