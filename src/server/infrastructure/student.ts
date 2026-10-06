import { and, eq, isNull } from 'drizzle-orm';
import { studentGradeTable, studentTable, studentToCareCenterTable } from '#database/schema.ts';
import type { ShortGrade, StudentToCareCenterRemovedReason } from '#lib/enums/student.ts';
import type { ISODateString } from '#lib/types.ts';
import type { Executor } from '#server/infrastructure/database.ts';

export type NewStudent = {
	careCenterId: string;
	name: string;
	birth: ISODateString;
	grade: ShortGrade;
	createdBy: string;
};

export type StudentRemoval = {
	careCenterId: string;
	studentId: string;
	reason: StudentToCareCenterRemovedReason;
	removedBy: string;
};

export class StudentRepository {
	static readonly inject = ['executor'] as const;

	constructor(private readonly db: Executor) {}

	findByCareCenter(careCenterId: string) {
		return this.db.query.studentToCareCenterTable
			.findMany({
				orderBy: { id: 'desc' },
				where: { careCenterId, removedAt: { isNull: true } },
				columns: { addedAt: true },
				with: { student: { columns: { id: true, name: true, birth: true, grade: true } } },
			})
			.sync();
	}

	findByNameAndBirth(name: string, birth: ISODateString, careCenterId: string | undefined) {
		const filter = careCenterId ? { careCenterId } : undefined;

		return this.db.query.studentTable
			.findMany({
				where: { name, birth, ...(filter && { activeCareCenters: filter }) },
				columns: { id: true, grade: true },
				with: {
					activeCareCenters: {
						...(filter && { where: filter }),
						columns: {},
						with: { careCenter: { columns: { fullName: true } } },
					},
				},
			})
			.sync();
	}

	// Call within a transaction.
	insert({ careCenterId, createdBy, ...student }: NewStudent) {
		const { id } = this.db
			.insert(studentTable)
			.values({ ...student, createdBy })
			.returning({ id: studentTable.id })
			.all()[0]!;

		this.db
			.insert(studentGradeTable)
			.values({ studentId: id, grade: student.grade, createdBy })
			.run();

		this.db
			.insert(studentToCareCenterTable)
			.values({ studentId: id, careCenterId, addedBy: createdBy })
			.run();

		return id;
	}

	// Returns `false` if the student is not in the care center.
	removeFromCareCenter({ careCenterId, studentId, reason, removedBy }: StudentRemoval) {
		return (
			this.db
				.update(studentToCareCenterTable)
				.set({ removedAt: new Date(), removedBy, removedReason: reason })
				.where(
					and(
						eq(studentToCareCenterTable.careCenterId, careCenterId),
						eq(studentToCareCenterTable.studentId, studentId),
						isNull(studentToCareCenterTable.removedAt),
					),
				)
				.returning({ id: studentToCareCenterTable.id })
				.all().length > 0
		);
	}
}
