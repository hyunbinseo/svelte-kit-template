import { and, eq, isNull } from 'drizzle-orm';
import { db } from '#database/client.ts';
import { studentGradeTable, studentTable, studentToCareCenterTable } from '#database/schema.ts';
import type { ShortGrade, StudentToCareCenterRemovedReason } from '#lib/enums/student.ts';
import type { ISODateString } from '#lib/types.ts';

export const findStudents = (careCenterId: string) => {
	const rows = db.query.studentToCareCenterTable
		.findMany({
			orderBy: { id: 'desc' },
			where: { careCenterId, removedAt: { isNull: true } },
			columns: { addedAt: true },
			with: { student: { columns: { id: true, name: true, birth: true, grade: true } } },
		})
		.sync();

	return rows.map((row) => ({ ...row.student, addedAt: row.addedAt }));
};

// Pass `careCenterId` to search only within that care center.
export const findDuplicateStudents = (
	student: { name: string; birth: ISODateString },
	careCenterId: string | undefined,
) => {
	const filter = careCenterId ? { careCenterId } : undefined;

	const students = db.query.studentTable
		.findMany({
			where: { ...student, ...(filter && { activeCareCenters: filter }) },
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

	return students.map((row) => ({
		id: row.id,
		grade: row.grade,
		careCenters: row.activeCareCenters.map(({ careCenter }) => careCenter.fullName),
	}));
};

export const insertStudent = (
	{
		careCenterId,
		...student
	}: { careCenterId: string; name: string; birth: ISODateString; grade: ShortGrade },
	createdBy: string,
) =>
	db.transaction((tx) => {
		const { id } = tx
			.insert(studentTable)
			.values({ ...student, createdBy })
			.returning({ id: studentTable.id })
			.all()[0]!;

		tx.insert(studentGradeTable).values({ studentId: id, grade: student.grade, createdBy }).run();

		tx.insert(studentToCareCenterTable)
			.values({ studentId: id, careCenterId, addedBy: createdBy })
			.run();

		return { id, name: student.name };
	});

// Returns `false` if the student is not in the care center.
export const removeStudent = (
	{
		careCenterId,
		studentId,
		reason,
	}: { careCenterId: string; studentId: string; reason: StudentToCareCenterRemovedReason },
	removedBy: string,
) =>
	db
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
		.all().length > 0;
