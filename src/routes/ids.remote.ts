import { form } from '$app/server';
import { FormSchema } from './ids';

export const addId = form(FormSchema, () => {});
