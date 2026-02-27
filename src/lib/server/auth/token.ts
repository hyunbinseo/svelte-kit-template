import { env } from '$env/dynamic/private';
import { jwtVerify } from 'jose';
import { minLength, optional, parse, pipe, string, transform } from 'valibot';

const SecretSchema = pipe(
	string(),
	minLength(1),
	transform((value) => new TextEncoder().encode(value)),
);

const SECRET_NEW = parse(SecretSchema, env.JWT_SECRET_NEW);
const SECRET_OLD = parse(optional(SecretSchema), env.JWT_SECRET_OLD);

// type PrivateClaims = { roles?: [Role, ...Role[]] };

type ReservedClaims = {
	jti: string; // JWT ID
	sub: string; // Subject
	exp: number; // Expiration Time
	iat: number; // Issued At
};

export type Payload = ReservedClaims;

export const verifyToken = async (jwt: string) => {
	if (!SECRET_OLD) {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	}
	try {
		return await jwtVerify<Payload>(jwt, SECRET_NEW);
	} catch {
		return await jwtVerify<Payload>(jwt, SECRET_OLD);
	}
};
