import { err, ok, type Result } from 'neverthrow';
import type { Failure } from '#server/domain/failure.ts';

// Lifts a nullable lookup into a Result that fails with `missing` when nothing is found.
export const required = <T>(value: T | null | undefined, missing: Failure): Result<T, Failure> =>
	value === null || value === undefined ? err(missing) : ok(value);
