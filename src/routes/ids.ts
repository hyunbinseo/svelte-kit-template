import { object, picklist } from 'valibot';

export const osArray = ['windows', 'mac', 'linux'] as const;

export const FormSchema = object({ os: picklist(osArray) });
