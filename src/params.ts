import { defineParams } from '@sveltejs/kit/params';
import { UUIDSchema } from '#lib/valibot.ts';

export const params = defineParams({
	uuid: UUIDSchema,
});
