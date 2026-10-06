import { userProfileTable, userTable } from '#database/schema.ts';
import type { ISODateString } from '#lib/types.ts';
import type { Executor } from '#server/infrastructure/database.ts';

export class UserRepository {
	static readonly inject = ['executor'] as const;

	constructor(private readonly db: Executor) {}

	findActiveByContact(contact: string) {
		return this.db.query.userTable
			.findFirst({
				where: { contact, deactivatedAt: { isNull: true } },
				columns: { id: true },
			})
			.sync();
	}

	findActiveWithAccess(id: string) {
		return this.db.query.userTable
			.findFirst({
				where: { id, deactivatedAt: { isNull: true } },
				columns: { id: true },
				with: {
					profile: { columns: { id: true } },
					activeRoles: { columns: { role: true } },
				},
			})
			.sync();
	}

	findActiveWithProfile(id: string) {
		return this.db.query.userTable
			.findFirst({
				where: { id, deactivatedAt: { isNull: true } },
				columns: { id: true, contact: true },
				with: { profile: { columns: { birth: true } } },
			})
			.sync();
	}

	insert(contact: string) {
		return this.db.insert(userTable).values({ contact }).returning({ id: userTable.id }).all()[0]!
			.id;
	}

	insertProfile(id: string, birth: ISODateString) {
		this.db.insert(userProfileTable).values({ id, birth }).onConflictDoNothing().run();
	}
}
