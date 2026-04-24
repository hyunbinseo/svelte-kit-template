import type { HTMLInputAttributes } from 'svelte/elements';
import type { GenericSchema, InferOutput } from 'valibot';

export type FormAttributes<TSchema extends GenericSchema<Record<string, unknown>, unknown>> =
	Record<
		keyof InferOutput<TSchema>,
		Omit<
			HTMLInputAttributes,
			keyof Pick<HTMLInputAttributes, 'name' | 'type' | 'value' | 'autofocus'>
		>
	>;
