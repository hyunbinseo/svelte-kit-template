import { err, ok, type Result } from 'neverthrow';
import type { ISODateString } from '#lib/types.ts';
import type { Failure } from '#server/domain/failure.ts';
import type {
	NewStudent,
	StudentRemoval,
	StudentRepository,
} from '#server/infrastructure/student.ts';

export class Students {
	static readonly inject = ['studentRepository'] as const;

	constructor(private readonly repository: StudentRepository) {}

	list(careCenterId: string) {
		return ok(
			this.repository
				.findByCareCenter(careCenterId)
				.map((row) => ({ ...row.student, addedAt: row.addedAt })),
		);
	}

	findDuplicates(name: string, birth: ISODateString, careCenterId: string | undefined) {
		return ok(
			this.repository.findByNameAndBirth(name, birth, careCenterId).map((student) => ({
				id: student.id,
				grade: student.grade,
				careCenters: student.activeCareCenters.map(({ careCenter }) => careCenter.fullName),
			})),
		);
	}

	register(student: NewStudent) {
		return ok({ id: this.repository.insert(student), name: student.name });
	}

	remove(removal: StudentRemoval): Result<void, Failure> {
		return this.repository.removeFromCareCenter(removal) ? ok(undefined) : err({ status: 404 });
	}
}
