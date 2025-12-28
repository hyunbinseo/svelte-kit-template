import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.ts';

export const relations = defineRelations(schema, (r) => ({
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
	},
}));
