import { dev } from '$app/environment';
import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { loginTable, userTable } from '$lib/server/db/schema';
import { invalid } from '@sveltejs/kit';
import { PublicSendCodeSchema, RATE_LIMITED } from '.';
import { checkSession } from './index.server';

export const sendCode = form(PublicSendCodeSchema, async (data, issue) => {
	checkSession();

	const user =
		(await db.query.userTable.findFirst({
			orderBy: { id: 'desc' },
			where: {
				contact: data.email,
				deactivatedAt: { isNull: true },
			},
		})) ??
		(await db
			.insert(userTable)
			.values({ contact: data.email })
			.returning()
			.then((users) => users[0]))!;

	const existingLogin = await db.query.loginTable.findFirst({
		orderBy: { id: 'desc' },
		columns: {},
		where: {
			userId: user.id,
			expiresAt: { gte: new Date() },
		},
		with: {
			attempts: {
				orderBy: { id: 'desc' },
				columns: { isSuccessful: true },
			},
		},
	});

	if (existingLogin && !existingLogin.attempts.some((a) => a.isSuccessful)) {
		invalid(issue.email(RATE_LIMITED));
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
		.then((login) => login[0]))!;

	// TODO Implement email send logic
	if (dev) console.table({ email: data.email, code: login.code });

	return {
		id: login.id,
		email: data.email,
	};
});
