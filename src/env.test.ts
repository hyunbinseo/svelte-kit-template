import { expect, test } from 'vite-plus/test';
import { AppEnvSchema, DbEnvSchema } from '#lib/env.ts';
import { variables } from './env.ts';

test('declares every app and database variable with its schema', () => {
	const libSchemas = { ...AppEnvSchema.entries, ...DbEnvSchema.entries };
	const kitSchemas = Object.fromEntries(
		Object.entries(variables).map(([name, { schema }]) => [name, schema]),
	);
	expect(kitSchemas).toEqual(libSchemas);
});
