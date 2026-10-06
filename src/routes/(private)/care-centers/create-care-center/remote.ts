import { resolve } from '$app/paths';
import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { requireRole } from '#auth/server/session.ts';
import { insertCareCenter } from '#server/care-center/service.ts';
import { CreateCareCenterSchema } from './shared.ts';

export const createCareCenter = form(CreateCareCenterSchema, (data) => {
	const session = requireRole('admin');

	const careCenter = insertCareCenter(data, session.sub);

	redirect(
		303,
		resolve('/(private)/care-centers/[careCenterId=uuid]/students', {
			careCenterId: careCenter.id,
		}),
	);
});
