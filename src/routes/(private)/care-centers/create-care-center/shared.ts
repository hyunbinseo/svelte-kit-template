import { maxLength, nonEmpty, object, picklist, pipe, string, trim } from 'valibot';
import { careCenterTypes } from '#lib/enums/care-center.ts';

const TextSchema = pipe(string(), trim(), nonEmpty(), maxLength(100));

export const CreateCareCenterSchema = object({
	type: picklist(careCenterTypes),
	fullName: TextSchema,
	name: TextSchema,
	address: TextSchema,
	contact: TextSchema,
});
