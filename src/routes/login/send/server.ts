import { eq } from 'drizzle-orm';
import type { InferOutput } from 'valibot';
import { loginTable } from '#database/schema.ts';
import { pick } from '#lib/pick.ts';
import type { Database } from '../../../app.d.ts';
import type { SendCodeSchema } from './shared.ts';

export const findActiveUser = (
	tx: Database,
	data: Pick<InferOutput<typeof SendCodeSchema>, 'contact'>,
) =>
	tx.query.userTable
		.findFirst({
			where: { ...pick(data, ['contact']), deactivatedAt: { isNull: true } },
			columns: { id: true },
		})
		.sync();

export const findLatestUnexpiredLogin = (
	tx: Database,
	data: Pick<InferOutput<typeof SendCodeSchema>, 'contact'>,
) =>
	tx.query.loginTable
		.findFirst({
			orderBy: { id: 'desc' },
			where: { ...pick(data, ['contact']), expiresAt: { gte: new Date() } },
			columns: {},
			with: { successfulAttempts: { columns: { id: true } } },
		})
		.sync();

export const insertLogin = (
	tx: Database,
	data: Pick<typeof loginTable.$inferInsert, 'contact' | 'userId' | 'code' | 'ip'>,
) =>
	tx
		.insert(loginTable)
		.values(pick(data, ['contact', 'userId', 'code', 'ip']))
		.returning({ id: loginTable.id })
		.all()[0]!;

export const markDelivered = (
	db: Database,
	data: Pick<typeof loginTable.$inferSelect, 'id' | 'sendId'>,
) => {
	db.update(loginTable)
		.set(pick(data, ['sendId']))
		.where(eq(loginTable.id, data.id))
		.run();
};

export const discardLogin = (db: Database, data: Pick<typeof loginTable.$inferSelect, 'id'>) => {
	db.delete(loginTable).where(eq(loginTable.id, data.id)).run();
};
