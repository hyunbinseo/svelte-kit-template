import { captureException } from '@sentry/sveltekit';
import { invalid, redirect } from '@sveltejs/kit';
import { db } from '#db/app/client.ts';
import {
	completeLogin,
	discardLogin,
	markLoginSent,
	startLogin,
} from '#db/app/login/procedures.ts';
import { authErrorMessages } from '#lib/auth/errors.ts';
import { parseReturnTo } from '#lib/auth/return-to.ts';
import { sendLoginCode } from '#lib/server/auth/sender.ts';
import { requireLoggedOut, setSessionCookie } from '#lib/server/auth/session.ts';
import {
	createLoginCode,
	createSecret,
	hashLoginCode,
	hashSessionSecret,
} from '#lib/server/auth/token.ts';
import { deleteLoginCookie, getLoginCookie, setLoginCookie } from '#routes/login/login.server.ts';
import { SendCodeSchema, VerifyCodeSchema } from '#routes/login/shared.ts';
import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';

export const sendCode = form(SendCodeSchema, async ({ contact }, issue) => {
	requireLoggedOut();

	const code = createLoginCode();
	const secret = createSecret();

	const started = startLogin(db, {
		codeHash: hashLoginCode(secret, code),
		contact,
		ip: getRequestEvent().getClientAddress(),
	});
	if (!started.ok) invalid(issue.contact(authErrorMessages[started.error]));

	let sendId: string | undefined;
	try {
		({ sendId } = await sendLoginCode({ code, contact }));
	} catch (error) {
		console.error(error);
		captureException(error);
		discardLogin(db, { loginId: started.loginId });
		invalid(issue.contact(authErrorMessages.code_send_failed));
	}
	if (sendId !== undefined) markLoginSent(db, { loginId: started.loginId, sendId });

	setLoginCookie(started.loginId, secret);
});

export const verifyCode = form(VerifyCodeSchema, ({ code, returnTo }, issue) => {
	requireLoggedOut();

	const login = getLoginCookie();
	if (!login) invalid(issue.code(authErrorMessages.login_expired));

	const sessionSecret = createSecret();
	const result = completeLogin(db, {
		codeHash: hashLoginCode(login.secret, code),
		ip: getRequestEvent().getClientAddress(),
		loginId: login.id,
		secretHash: hashSessionSecret(sessionSecret),
	});

	// The code can be retried while attempts are left.
	if (!result.ok && result.error === 'code_mismatch') {
		invalid(issue.code(authErrorMessages.code_mismatch));
	}

	deleteLoginCookie();
	if (!result.ok) {
		// expired, used, or out of attempts
		const authError = result.error === 'login_not_found' ? 'login_expired' : result.error;
		invalid(issue.code(authErrorMessages[authError]));
	}

	setSessionCookie(result.userSessionId, sessionSecret, result.expiresAt);

	const target = parseReturnTo(returnTo);
	if (result.isOnboarded) redirect(303, target ?? resolve(''));
	redirect(
		303,
		target === undefined
			? resolve('onboarding')
			: resolve(`onboarding?returnTo=${encodeURIComponent(target)}`),
	);
});
