import { object, picklist } from 'valibot';

export const FormSchema = object({
	operatingSystem: picklist(['windows', 'mac', 'linux']),
});
