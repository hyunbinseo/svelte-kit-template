import { dev } from '$app/env';
import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { requireLoggedOut } from '#auth/server/session.ts';
import { createLogin, deliverCode, discardLogin } from './server.ts';
import { SendCodeSchema, sendErrors } from './shared.ts';

export const sendCode = form(SendCodeSchema, async (data, issue) => {
	requireLoggedOut();

	const result = createLogin(data);
	if (result.errorCode) invalid(issue.contact(sendErrors[result.errorCode]));

	if (dev) console.table({ contact: data.contact, code: result.code });

	const isDelivered = await deliverCode({
		loginId: result.login.id,
		contact: data.contact,
		code: result.code,
	});

	if (!isDelivered) {
		discardLogin(result.login.id);
		invalid(issue.contact(sendErrors.SEND_FAILED));
	}

	return {
		id: result.login.id,
		contact: data.contact,
	};
});
