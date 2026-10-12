import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.ts';

export const relations = defineRelations(schema, (r) => ({
	userSessionTable: {
		activeUser: r.one.userTable({
			from: r.userSessionTable.userId,
			to: r.userTable.id,
			where: { deactivatedAt: { isNull: true } },
		}),
	},
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
}));
