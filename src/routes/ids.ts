import { object, pipe, string, uuid } from 'valibot';

export const FormSchema = object({
	uuid: pipe(string(), uuid()),
});
