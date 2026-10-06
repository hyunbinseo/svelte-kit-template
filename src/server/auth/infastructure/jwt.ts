import { captureException, logger } from '@sentry/sveltekit';
import { jwtVerify, SignJWT } from 'jose';
import { JOSEError, JWSSignatureVerificationFailed, JWTExpired } from 'jose/errors';
import { AUTH_TOKEN_ALGORITHM } from '#lib/auth/config.ts';
import type { UserRole } from '#lib/enums/user.ts';

// Optional claims are omitted to save bytes.
type PrivateClaims = {
	profile?: null;
	roles?: [UserRole, ...UserRole[]];
};

type ReservedClaims = {
	jti: string; // JWT ID
	sub: string; // Subject
	exp: number; // Expiration Time
	iat: number; // Issued At
};

export type Payload = PrivateClaims & ReservedClaims;

export type JWTSecrets = {
	current: Uint8Array;
	previous: Uint8Array | undefined;
};

export class TokenProvider {
	static readonly inject = ['jwtSecrets'] as const;

	constructor(private readonly secrets: JWTSecrets) {}

	sign(
		token: { id: string; issuedAt: Date; expiresAt: Date },
		user: { sub: string; profile: boolean; roles: Set<UserRole> },
	) {
		const roles = user.roles.size
			? (Array.from(user.roles) as [UserRole, ...UserRole[]])
			: undefined;

		const privateClaims: PrivateClaims = {
			...(roles && { roles }),
			...(!user.profile && { profile: null }),
		};

		return (
			new SignJWT(privateClaims)
				.setProtectedHeader({ alg: AUTH_TOKEN_ALGORITHM })
				// Must match the ReservedClaims type.
				.setJti(token.id)
				.setSubject(user.sub)
				.setExpirationTime(token.expiresAt)
				.setIssuedAt(token.issuedAt)
				.sign(this.secrets.current)
		);
	}

	async verify(jwt: string) {
		try {
			return (await this.verifyWithFallback(jwt)).payload;
		} catch (e) {
			if (e instanceof JWTExpired) return undefined;
			if (e instanceof JOSEError) logger.warn('Invalid JWT', { 'error.type': e.code });
			else captureException(e);
			return undefined;
		}
	}

	private async verifyWithFallback(jwt: string) {
		try {
			return await jwtVerify<Payload>(jwt, this.secrets.current);
		} catch (e) {
			if (!this.secrets.previous || !(e instanceof JWSSignatureVerificationFailed)) throw e;
			return await jwtVerify<Payload>(jwt, this.secrets.previous);
		}
	}
}
