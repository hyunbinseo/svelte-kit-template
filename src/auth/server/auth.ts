import { randomUUIDv7 } from 'node:crypto';
import { AUTH_SECRET } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import {
	AUTH_ALLOW_UNREGISTERED,
	AUTH_CODE_EXPIRES_IN,
	AUTH_CODE_LENGTH,
	AUTH_CODE_MAX_ATTEMPTS,
	AUTH_COOKIE_NAME,
	AUTH_SESSION_EXPIRES_IN,
	AUTH_SESSION_UPDATE_AGE,
} from '#auth/config.ts';
import { appDb } from '#database/app/client.ts';
import {
	userAccountTable,
	userSessionTable,
	userTable,
	verificationTable,
} from '#database/app/schema.ts';
import { SECOND } from '#lib/time.ts';
import { db } from './db.ts';
import { sendLoginCode } from './email.ts';

export const auth = betterAuth({
	secret: AUTH_SECRET,
	database: drizzleAdapter(appDb, {
		provider: 'sqlite',
		schema: {
			user: userTable,
			session: userSessionTable,
			account: userAccountTable,
			verification: verificationTable,
		},
	}),
	user: { fields: { email: 'contact' } },
	session: {
		expiresIn: AUTH_SESSION_EXPIRES_IN / SECOND,
		updateAge: AUTH_SESSION_UPDATE_AGE / SECOND,
	},
	advanced: {
		database: { generateId: () => randomUUIDv7() },
		cookies: { session_token: { name: AUTH_COOKIE_NAME } },
	},
	databaseHooks: {
		session: {
			create: {
				before: (session) => {
					if (!db.findActiveUserById(session.userId)) {
						throw new APIError('FORBIDDEN', { code: 'USER_DEACTIVATED' });
					}
					const ipAddress = getRequestEvent().getClientAddress();
					return Promise.resolve({ data: { ...session, ipAddress } });
				},
			},
		},
	},
	plugins: [
		emailOTP({
			otpLength: AUTH_CODE_LENGTH,
			expiresIn: AUTH_CODE_EXPIRES_IN / SECOND,
			allowedAttempts: AUTH_CODE_MAX_ATTEMPTS,
			disableSignUp: !AUTH_ALLOW_UNREGISTERED,
			sendVerificationOTP: sendLoginCode,
		}),
		sveltekitCookies(getRequestEvent),
	],
});
