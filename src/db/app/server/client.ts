import { parse } from 'valibot';
import { createAppDatabase } from '#db/app/server/database.ts';
import { hasActiveUserRole } from '#db/app/server/user/queries.ts';
import { createAuditDatabase } from '#db/audit/server/database.ts';
import { auditClient, type AuditContext } from '#db/audit/server/logger.ts';
import { isAuditEnabled, openDatabase, prepareDatabaseFile } from '#db/shared.server.ts';
import { ModeSchema } from '#lib/env.ts';
import { building, dev } from '$app/env';
import { DATA_DIR } from '$app/env/private';
import { getRequestEvent } from '$app/server';

const mode = parse(ModeSchema, import.meta.env.MODE);

const client = openDatabase(building ? ':memory:' : prepareDatabaseFile(DATA_DIR, mode, 'app'));

// Prerendering can't read the database, so there's nothing to audit.
const auditDb =
	!building && isAuditEnabled(mode)
		? createAuditDatabase(openDatabase(prepareDatabaseFile(DATA_DIR, mode, 'audit')))
		: undefined;

// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
if (!dev) {
	process.on('sveltekit:shutdown', () => {
		client.close();
		auditDb?.$client.close();
	});
}

const getAuditContext = (): AuditContext => {
	const event = getRequestEvent();
	const userId = event.locals.user?.id ?? null;

	return {
		// Unaudited reads, so this doesn't log itself.
		byStaff: userId !== null && hasActiveUserRole(db, { userId }),
		ip: event.getClientAddress(),
		pathname: event.url.pathname,
		userId,
	};
};

const auditOptions = auditDb && {
	auditDb,
	getContext: getAuditContext,
	report: console.error, // TODO Sentry, see specs/10-observability.md
};

// Writes are always audited.
export const db = createAppDatabase(
	auditOptions ? auditClient(client, { ...auditOptions, isReadAudited: false }) : client,
);

// Reads too, for routes that opt in
export const auditedDb = auditOptions
	? createAppDatabase(auditClient(client, { ...auditOptions, isReadAudited: true }))
	: db;
