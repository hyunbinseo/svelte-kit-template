import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const createSessionSecret = () => randomBytes(32).toString('base64url');

export const hashSessionSecret = (secret: string) =>
	createHash('sha256').update(secret).digest('hex');

export const toSessionToken = (id: string, secret: string) => `${id}.${secret}`;

export const parseSessionToken = (token: string) => {
	const [id, secret, ...rest] = token.split('.');
	if (!id || !secret || rest.length) return undefined;
	return { id, secret };
};

export const verifySessionSecret = (secret: string, secretHash: string) =>
	timingSafeEqual(
		Buffer.from(hashSessionSecret(secret), 'hex'), //
		Buffer.from(secretHash, 'hex'),
	);
