import { STATUS_CODES } from 'node:http';
import { error, invalid } from '@sveltejs/kit';
import { ok, type Result } from 'neverthrow';
import { requireOnboarded } from '#auth/server/session.ts';
import type { Failure } from '#server/domain/failure.ts';
import type { Viewer } from '#server/domain/viewer.ts';

export const currentViewer = (): Result<Viewer, Failure> => {
	const session = requireOnboarded();
	return ok({ userId: session.sub, isAdmin: session.roles.has('admin') });
};

// Queries and commands surface failures as HTTP errors.
export const throwFailure = ({ status, message }: Failure): never => error(status, message);

// Forms surface failures as form-level issues so they render next to the form.
export const rejectForm = ({ status, message }: Failure): never =>
	invalid(message ?? STATUS_CODES[status] ?? 'Error');
