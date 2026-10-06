import { Err, type Result } from 'neverthrow';
import type { CareCenters } from '#server/domain/care-center.ts';
import type { Failure } from '#server/domain/failure.ts';
import type { Students } from '#server/domain/student.ts';
import type { Database, Executor } from '#server/infrastructure/database.ts';

export type Content = {
	careCenters: CareCenters;
	students: Students;
};

export class Transactions {
	static readonly inject = ['db', 'createContent'] as const;

	constructor(
		private readonly db: Database,
		private readonly createContent: (executor: Executor) => Content,
	) {}

	run<T>(work: (content: Content) => Result<T, Failure>): Result<T, Failure> {
		try {
			return this.db.transaction(
				(tx) => {
					const result = work(this.createContent(tx));
					// Drizzle rolls back on throw; preserve the original Err unchanged.
					if (result.isErr()) throw result;
					return result;
				},
				{ behavior: 'immediate' },
			);
		} catch (e) {
			if (e instanceof Err) return e as Result<T, Failure>;
			throw e;
		}
	}
}
