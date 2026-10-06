import { error } from '@sveltejs/kit';
import { isNull } from 'drizzle-orm';
import { requireOnboarded } from '#auth/server/session.ts';
import { db } from '#database/client.ts';
import { careCenterTable, careCenterUserRoleTable } from '#database/schema.ts';
import type { CareCenterRole, CareCenterType } from '#lib/enums/care-center.ts';
import { fail } from '#lib/failure.ts';
import { CareCenter } from './domain.ts';

export const requireCareCenterAccess = (careCenterId: string) => {
	const session = requireOnboarded();

	const careCenter = db.query.careCenterTable
		.findFirst({
			where: { id: careCenterId, deactivatedAt: { isNull: true } },
			columns: { id: true, name: true, fullName: true },
			with: { activeUserRoles: { where: { userId: session.sub }, columns: { role: true } } },
		})
		.sync();

	if (!careCenter) error(404);

	const { activeUserRoles, ...rest } = careCenter;
	const viewer = { isAdmin: session.roles.has('admin'), roles: activeUserRoles.map((r) => r.role) };

	if (!CareCenter.canAccess(viewer)) error(403);

	return { session, careCenter: rest, canManage: CareCenter.canManage(viewer) };
};

export const requireCareCenterManager = (careCenterId: string) => {
	const access = requireCareCenterAccess(careCenterId);
	if (!access.canManage) error(403);
	return access;
};

export const findCareCenters = (userId: string, isAdmin: boolean) =>
	db.query.careCenterTable
		.findMany({
			orderBy: { name: 'asc', id: 'asc' },
			where: {
				deactivatedAt: { isNull: true },
				// Mirrors `CareCenter.canAccess` in SQL.
				...(!isAdmin && { activeUserRoles: { userId } }),
			},
			columns: { id: true, type: true, name: true, fullName: true },
		})
		.sync();

export const insertCareCenter = (
	careCenter: {
		type: CareCenterType;
		fullName: string;
		name: string;
		address: string;
		contact: string;
	},
	createdBy: string,
) =>
	db
		.insert(careCenterTable)
		.values({ ...careCenter, createdBy })
		.returning({ id: careCenterTable.id })
		.all()[0]!;

export const findMembers = (careCenterId: string) => {
	const rows = db.query.careCenterUserRoleTable
		.findMany({
			orderBy: { id: 'asc' },
			where: { careCenterId, revokedAt: { isNull: true } },
			columns: { id: true, role: true, assignedAt: true },
			with: { user: { columns: { contact: true } } },
		})
		.sync();

	return rows.map(({ user, ...row }) => ({ ...row, contact: user.contact }));
};

export const assignMember = (
	{ careCenterId, contact, role }: { careCenterId: string; contact: string; role: CareCenterRole },
	assignedBy: string,
) =>
	db.transaction(
		(tx) => {
			const user = tx.query.userTable
				.findFirst({
					where: { contact, deactivatedAt: { isNull: true } },
					columns: { id: true },
				})
				.sync();

			if (!user) return fail('USER_NOT_FOUND');

			const assigned = tx
				.insert(careCenterUserRoleTable)
				.values({ careCenterId, userId: user.id, role, assignedBy })
				.onConflictDoNothing({
					target: [
						careCenterUserRoleTable.careCenterId,
						careCenterUserRoleTable.userId,
						careCenterUserRoleTable.role,
					],
					where: isNull(careCenterUserRoleTable.revokedAt),
				})
				.returning({ id: careCenterUserRoleTable.id })
				.all();

			if (!assigned.length) return fail('ALREADY_ASSIGNED');

			return undefined;
		},
		{ behavior: 'immediate' },
	);
