import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.ts';

export const relations = defineRelations(schema, (r) => ({
	userTable: {
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
		activeUser: r.one.userTable({
			from: r.loginTable.userId,
			to: r.userTable.id,
			where: { deactivatedAt: { isNull: true } },
		}),
		successfulAttempts: r.many.loginAttemptTable({
			from: r.loginTable.id,
			to: r.loginAttemptTable.loginId,
			where: { isSuccessful: true },
		}),
	},
}));
