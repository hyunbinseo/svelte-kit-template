import { maxLength, nonEmpty, object, picklist, pipe, string, trim } from 'valibot';
import { careCenterRoles, careCenterTypes } from '#lib/enums/care-center.ts';
import { EmailSchema, UUIDSchema } from '#lib/valibot.ts';

const TextSchema = pipe(string(), trim(), nonEmpty(), maxLength(100));

export const CreateCareCenterSchema = object({
	type: picklist(careCenterTypes),
	fullName: TextSchema,
	name: TextSchema,
	address: TextSchema,
	contact: TextSchema,
});

export const AssignMemberSchema = object({
	careCenterId: UUIDSchema,
	contact: EmailSchema,
	role: picklist(careCenterRoles),
});
