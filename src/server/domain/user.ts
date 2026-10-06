import { err, ok, type Result } from 'neverthrow';
import type { ISODateString } from '#lib/types.ts';
import type { Failure } from '#server/domain/failure.ts';
import type { UserRepository } from '#server/infrastructure/user.ts';

export class Accounts {
	static readonly inject = ['userRepository'] as const;

	constructor(private readonly users: UserRepository) {}

	current(
		id: string,
	): Result<{ id: string; contact: string; profile: { birth: ISODateString } }, Failure> {
		const user = this.users.findActiveWithProfile(id);
		if (!user?.profile) return err({ status: 500 });
		return ok({ ...user, profile: user.profile });
	}

	setupProfile(id: string, birth: ISODateString) {
		this.users.insertProfile(id, birth);
	}
}
