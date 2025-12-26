import { randomUUID } from 'node:crypto';
import type { PageServerLoad } from './$types';
import { checkSession } from './index.server';

export const load = (() => {
	checkSession();
	return {
		title: '로그인',
		formId: randomUUID(),
	};
}) satisfies PageServerLoad;
