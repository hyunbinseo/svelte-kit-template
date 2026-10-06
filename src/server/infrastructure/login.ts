import { eq } from 'drizzle-orm';
import { loginAttemptTable, loginTable } from '#database/schema.ts';
import type { Executor } from '#server/infrastructure/database.ts';

export type NewLogin = {
	contact: string;
	userId: string | null;
	code: string;
	ip: string;
};

export class LoginRepository {
	static readonly inject = ['executor'] as const;

	constructor(private readonly db: Executor) {}

	findLatestPending(contact: string) {
		return this.db.query.loginTable
			.findFirst({
				orderBy: { id: 'desc' },
				where: { contact, expiresAt: { gte: new Date() } },
				columns: {},
				with: { successfulAttempts: { columns: { id: true } } },
			})
			.sync();
	}

	insert(login: NewLogin) {
		return this.db.insert(loginTable).values(login).returning({ id: loginTable.id }).all()[0]!.id;
	}

	setSendId(id: string, sendId: string) {
		this.db.update(loginTable).set({ sendId }).where(eq(loginTable.id, id)).run();
	}

	delete(id: string) {
		this.db.delete(loginTable).where(eq(loginTable.id, id)).run();
	}

	findForVerification(id: string, contact: string) {
		return this.db.query.loginTable
			.findFirst({
				where: { id, contact },
				columns: { userId: true, code: true, expiresAt: true, ip: true },
				with: {
					attempts: { columns: { isSuccessful: true } },
					activeUserByContact: { columns: { id: true } },
				},
			})
			.sync();
	}

	insertAttempt(loginId: string, isSuccessful: boolean, ip: string) {
		this.db.insert(loginAttemptTable).values({ loginId, isSuccessful, ip }).run();
	}

	linkUser(id: string, userId: string) {
		this.db.update(loginTable).set({ userId }).where(eq(loginTable.id, id)).run();
	}
}
