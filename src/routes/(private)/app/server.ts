import type { userTable } from '#database/schema.ts';
import { pick } from '#lib/pick.ts';
import type { Database } from '../../../app.d.ts';

export const findCurrentUser = (db: Database, data: Pick<typeof userTable.$inferSelect, 'id'>) =>
	db.query.userTable
		.findFirst({
			where: { ...pick(data, ['id']), deactivatedAt: { isNull: true } },
			columns: { id: true, contact: true },
			with: { profile: { columns: { birth: true } } },
		})
		.sync();
