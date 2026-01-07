import { dev } from '$app/environment';
import { form, getRequestEvent } from '$app/server';
import { IS_ALLOW_UNREGISTERED } from '$lib/config.server';
import { db } from '$lib/server/db';
import { loginTable, userTable } from '$lib/server/db/schema';
import { invalid } from '@sveltejs/kit';
import { PublicSendCodeSchema, RATE_LIMITED, UNREGISTERED } from '.';
import { checkSession } from './index.server';

export const sendCode = form(PublicSendCodeSchema, async (data, issue) => {
	checkSession();

	let user = await db.query.userTable.findFirst({
		orderBy: { id: 'desc' },
		where: {
			contact: data.contact,
			deactivatedAt: { isNull: true },
		},
	});

	if (!user) {
		if (!IS_ALLOW_UNREGISTERED) {
			invalid(issue.contact(UNREGISTERED));
		}
		user = (await db
			.insert(userTable)
			.values(data)
			.returning()
			.then(([user]) => user))!;
	}

	const existingLogin = await db.query.loginTable.findFirst({
		orderBy: { id: 'desc' },
		where: {
			userId: user.id,
			expiresAt: { gte: new Date() },
		},
		columns: {},
		with: {
			attempts: {
				orderBy: { id: 'desc' },
				columns: { isSuccessful: true },
			},
		},
	});

	if (existingLogin && !existingLogin.attempts.some((a) => a.isSuccessful)) {
		invalid(issue.contact(RATE_LIMITED));
	}

	const login = (await db
		.insert(loginTable)
		.values({
			userId: user.id,
			ip: getRequestEvent().getClientAddress(),
		})
		.returning({
			id: loginTable.id,
			code: loginTable.code,
		})
		.then(([login]) => login))!;

	// TODO Implement actual send logic
	if (dev) console.table({ contact: data.contact, code: login.code });

	return {
		id: login.id,
		contact: data.contact,
	};
});
