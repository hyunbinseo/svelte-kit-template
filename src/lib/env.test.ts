import { type GenericSchema, safeParse } from 'valibot';
import { expect, test } from 'vite-plus/test';
import { AdapterNodeEnvSchema, AppEnvSchema, DbEnvSchema } from '#lib/env.ts';

const EnvSchemas = [AppEnvSchema, DbEnvSchema, AdapterNodeEnvSchema] satisfies GenericSchema<
	Record<string, string | undefined>,
	unknown
>[];

const schemaEntries = EnvSchemas.flatMap((schema) => Object.entries(schema.entries));

test('variable names are unique', () => {
	const names = schemaEntries.map(([name]) => name);
	expect(names).toEqual([...new Set(names)]);
});

test.each(schemaEntries)('%s rejects empty values', (_, schema) => {
	expect(safeParse(schema, '').success).toBe(false);
});
