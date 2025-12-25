import { dev } from '$app/environment';
import { form } from '$app/server';
import { CODE_EXPIRES_IN, CODE_LENGTH, CODE_MAX_ATTEMPTS } from '$lib/config';
import { authenticate } from '$lib/server/auth';
import { mockDB } from '$lib/server/db';
import { error, invalid } from '@sveltejs/kit';
import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { CODE_INVALID, PublicSendCodeSchema, PublicValidateCodeSchema, RATE_LIMITED } from '.';
import { checkSession } from './index.server';

export const sendCode = form(PublicSendCodeSchema, async (data, issue) => {
	checkSession();

	const existingEntry = mockDB.get(data.email);

	if (existingEntry && existingEntry.expiresAt > Date.now()) {
		invalid(issue.email(RATE_LIMITED));
	}

	const id = randomUUID();
	const code = randomInt(0, Math.pow(10, CODE_LENGTH)).toString().padStart(CODE_LENGTH, '0');
	const now = Date.now();

	mockDB.set(data.email, {
		id,
		code,
		createdAt: now,
		expiresAt: now + CODE_EXPIRES_IN,
	});

	// TODO Implement email send logic
	if (dev) console.table({ email: data.email, code });

	return { id, email: data.email };
});

export const validateCode = form(PublicValidateCodeSchema, async (data, issue) => {
	checkSession();

	const entry = mockDB.get(data.email);

	if (!entry || entry.id !== data.id) error(400);

	if (entry.expiresAt < Date.now()) {
		return { success: false, code: 'CODE_EXPIRED' } as const;
	}

	if ((entry.attempts ?? 0) >= CODE_MAX_ATTEMPTS) {
		return { success: false, code: 'CODE_BLOCKED' } as const;
	}

	if (
		!timingSafeEqual(
			Buffer.from(entry.code), //
			Buffer.from(data.code),
		)
	) {
		entry.attempts = (entry.attempts ?? 0) + 1;
		invalid(issue.code(CODE_INVALID));
	}

	mockDB.delete(data.email);
	return await authenticate({ sub: data.email });
});
