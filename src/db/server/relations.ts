import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.ts';

export const relations = defineRelations(schema, (r) => ({
	userTable: {
		profile: r.one.userProfileTable({
			from: r.userTable.id,
			to: r.userProfileTable.id,
		}),
		activeRoles: r.many.userRoleTable({
			from: r.userTable.id,
			to: r.userRoleTable.userId,
			where: { revokedAt: { isNull: true } },
		}),
	},
	loginTable: {
		attempts: r.many.loginAttemptTable({
			from: r.loginTable.id,
			to: r.loginAttemptTable.loginId,
		}),
		activeUserByContact: r.one.userTable({
			from: r.loginTable.contact,
			to: r.userTable.contact,
			where: { deactivatedAt: { isNull: true } },
		}),
		successfulAttempts: r.many.loginAttemptTable({
			from: r.loginTable.id,
			to: r.loginAttemptTable.loginId,
			where: { isSuccessful: true },
		}),
	},
	careCenterTable: {
		activeUserRoles: r.many.careCenterUserRoleTable({
			from: r.careCenterTable.id,
			to: r.careCenterUserRoleTable.careCenterId,
			where: { revokedAt: { isNull: true } },
		}),
		activeStudents: r.many.studentToCareCenterTable({
			from: r.careCenterTable.id,
			to: r.studentToCareCenterTable.careCenterId,
			where: { removedAt: { isNull: true } },
		}),
	},
	careCenterUserRoleTable: {
		user: r.one.userTable({
			from: r.careCenterUserRoleTable.userId,
			to: r.userTable.id,
			optional: false,
		}),
	},
	studentTable: {
		activeCareCenters: r.many.studentToCareCenterTable({
			from: r.studentTable.id,
			to: r.studentToCareCenterTable.studentId,
			where: { removedAt: { isNull: true } },
		}),
	},
	studentToCareCenterTable: {
		careCenter: r.one.careCenterTable({
			from: r.studentToCareCenterTable.careCenterId,
			to: r.careCenterTable.id,
			optional: false,
		}),
		student: r.one.studentTable({
			from: r.studentToCareCenterTable.studentId,
			to: r.studentTable.id,
			optional: false,
		}),
	},
}));
