import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { LOGIN_CODE_DIGITS } from '#lib/auth/config.ts';

// Cookies hold `<id>.<secret>`; only the secret's SHA-256 hash is stored.

const SECRET_BYTES = 32; // 256 bits
const TOKEN_PATTERN = /^([1-9]\d{0,15})\.([\w-]{43})$/; // base64url, unpadded

export const createSecret = () => randomBytes(SECRET_BYTES);

export const formatToken = (id: number, secret: Buffer) => `${id}.${secret.toString('base64url')}`;

export const parseToken = (token: string | undefined) => {
	const match = token === undefined ? null : TOKEN_PATTERN.exec(token);
	if (!match?.[1] || !match[2]) return;

	const id = Number(match[1]);
	if (!Number.isSafeInteger(id)) return;

	// Rejects non-canonical encodings of the last character.
	const secret = Buffer.from(match[2], 'base64url');
	if (secret.toString('base64url') !== match[2]) return;

	return { id, secret };
};

export const hashSessionSecret = (secret: Buffer) => createHash('sha256').update(secret).digest();

// Bound to the browser holding the secret, see specs/08-auth.md
export const hashLoginCode = (secret: Buffer, code: string) =>
	createHash('sha256').update(secret).update(code).digest();

export const createLoginCode = () =>
	randomInt(10 ** LOGIN_CODE_DIGITS)
		.toString()
		.padStart(LOGIN_CODE_DIGITS, '0');

export const isSameHash = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);
