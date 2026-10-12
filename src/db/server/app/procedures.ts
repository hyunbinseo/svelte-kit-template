import { and, eq, isNull } from 'drizzle-orm';
import type { UserRole } from '#lib/enums/user.ts';
import { userRoleTable, userSessionTable, userTable } from './schema.ts';
import type { AppDb } from './types.ts';

export const deactivateUser = (
	db: AppDb,
	userId: string,
	deactivation: { deactivatedBy: string },
) =>
	db.transaction(
		(tx) => {
			const at = new Date();

			const user = tx
				.update(userTable)
				.set({ deactivatedAt: at, deactivatedBy: deactivation.deactivatedBy })
				.where(and(eq(userTable.id, userId), isNull(userTable.deactivatedAt)))
				.returning({ id: userTable.id })
				.all()[0];

			if (!user) return false;

			tx.update(userRoleTable)
				.set({ revokedAt: at, revokedBy: deactivation.deactivatedBy, revokeReason: 'deactivate' })
				.where(and(eq(userRoleTable.userId, userId), isNull(userRoleTable.revokedAt)))
				.run();

			tx.delete(userSessionTable).where(eq(userSessionTable.userId, userId)).run();

			return true;
		},
		{ behavior: 'immediate' },
	);

export const grantUserRole = (
	db: AppDb,
	userId: string,
	grant: { role: UserRole; assignedBy: string },
) =>
	db.transaction(
		(tx) => {
			const user = tx.query.userTable
				.findFirst({
					where: { id: userId, deactivatedAt: { isNull: true } },
					columns: { id: true },
					with: { activeRoles: { where: { role: grant.role }, columns: { id: true } } },
				})
				.sync();

			if (!user || user.activeRoles.length) return undefined;

			return tx
				.insert(userRoleTable)
				.values({ userId, role: grant.role, assignedBy: grant.assignedBy })
				.returning({ id: userRoleTable.id })
				.all()[0]!.id;
		},
		{ behavior: 'immediate' },
	);

export const revokeUserRole = (db: AppDb, roleId: string, revocation: { revokedBy: string }) =>
	db.transaction(
		(tx) =>
			tx
				.update(userRoleTable)
				.set({ revokedAt: new Date(), revokedBy: revocation.revokedBy, revokeReason: 'manual' })
				.where(and(eq(userRoleTable.id, roleId), isNull(userRoleTable.revokedAt)))
				.returning({ id: userRoleTable.id })
				.all().length > 0,
		{ behavior: 'immediate' },
	);
