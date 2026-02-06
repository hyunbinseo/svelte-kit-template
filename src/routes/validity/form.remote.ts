import { form } from '$app/server';
import { object, string } from 'valibot';

export const remoteForm = form(object({ name: string() }), (data) => {
	console.log(data);
});
