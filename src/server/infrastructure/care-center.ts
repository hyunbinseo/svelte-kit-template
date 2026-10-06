import { isNull } from 'drizzle-orm';
import { careCenterTable, careCenterUserRoleTable } from '#database/schema.ts';
import type { CareCenterRole, CareCenterType } from '#lib/enums/care-center.ts';
import type { Executor } from '#server/infrastructure/database.ts';

export type NewCareCenter = {
	type: CareCenterType;
	fullName: string;
	name: string;
	address: string;
	contact: string;
	createdBy: string;
};

export type NewCareCenterRole = {
	careCenterId: string;
	userId: string;
	role: CareCenterRole;
	assignedBy: string;
};

export class CareCenterRepository {
	static readonly inject = ['executor'] as const;

	constructor(private readonly db: Executor) {}

	findWithViewerRoles(careCenterId: string, userId: string) {
		return this.db.query.careCenterTable
			.findFirst({
				where: { id: careCenterId, deactivatedAt: { isNull: true } },
				columns: { id: true, name: true, fullName: true },
				with: { activeUserRoles: { where: { userId }, columns: { role: true } } },
			})
			.sync();
	}

	findAccessible(userId: string, isAdmin: boolean) {
		return this.db.query.careCenterTable
			.findMany({
				orderBy: { name: 'asc', id: 'asc' },
				where: {
					deactivatedAt: { isNull: true },
					...(!isAdmin && { activeUserRoles: { userId } }),
				},
				columns: { id: true, type: true, name: true, fullName: true },
			})
			.sync();
	}

	insert(careCenter: NewCareCenter) {
		return this.db
			.insert(careCenterTable)
			.values(careCenter)
			.returning({ id: careCenterTable.id })
			.all()[0]!;
	}

	findMembers(careCenterId: string) {
		return this.db.query.careCenterUserRoleTable
			.findMany({
				orderBy: { id: 'asc' },
				where: { careCenterId, revokedAt: { isNull: true } },
				columns: { id: true, role: true, assignedAt: true },
				with: { user: { columns: { contact: true } } },
			})
			.sync();
	}

	findActiveUserByContact(contact: string) {
		return this.db.query.userTable
			.findFirst({
				where: { contact, deactivatedAt: { isNull: true } },
				columns: { id: true },
			})
			.sync();
	}

	// Returns `false` if the role is already assigned.
	insertRole(role: NewCareCenterRole) {
		return (
			this.db
				.insert(careCenterUserRoleTable)
				.values(role)
				.onConflictDoNothing({
					target: [
						careCenterUserRoleTable.careCenterId,
						careCenterUserRoleTable.userId,
						careCenterUserRoleTable.role,
					],
					where: isNull(careCenterUserRoleTable.revokedAt),
				})
				.returning({ id: careCenterUserRoleTable.id })
				.all().length > 0
		);
	}
}
