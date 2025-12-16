import { object, pipe, string, uuid } from 'valibot';

export const PublicAddIdSchema = object({
	uuid: pipe(string(), uuid()),
});
