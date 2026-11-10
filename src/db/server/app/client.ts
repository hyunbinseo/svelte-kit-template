import { captureException } from '@sentry/sveltekit';
import { parse } from 'valibot';
import { createAppDb } from '#db/app/drizzle.ts';
import { createAuditDb } from '#db/audit/drizzle.ts';
import { auditConnection, type AuditContext } from '#db/audit/logger.ts';
import { openConnection } from '#db/shared/connection.ts';
import { isAuditEnabled, prepareDatabasePath } from '#db/shared/database.ts';
import { ModeSchema } from '#lib/env.ts';
import { loadSessionRoles } from '#lib/server/auth/roles.ts';
import { building, dev } from '$app/env';
import { DATA_DIR } from '$app/env/private';
import { getRequestEvent } from '$app/server';

const mode = parse(ModeSchema, import.meta.env.MODE);

const connection = openConnection(
	building ? ':memory:' : prepareDatabasePath(DATA_DIR, mode, 'app'),
);

// Prerendering can't read the database, so there's nothing to audit.
const auditDb =
	!building && isAuditEnabled(mode)
		? createAuditDb(openConnection(prepareDatabasePath(DATA_DIR, mode, 'audit')))
		: undefined;

// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
if (!dev) {
	process.on('sveltekit:shutdown', () => {
		connection.close();
		auditDb?.$client.close();
	});
}

const getAuditContext = (): AuditContext => {
	const event = getRequestEvent();
	const userId = event.locals.session?.userId ?? null;

	return {
		// Unaudited reads, so this doesn't log itself.
		byStaff: loadSessionRoles(db, event.locals).length > 0,
		ip: event.getClientAddress(),
		pathname: event.url.pathname,
		userId,
	};
};

const auditOptions = auditDb && {
	auditDb,
	getContext: getAuditContext,
	report: (error: unknown) => {
		console.error(error);
		captureException(error);
	},
};

// Writes are always audited.
export const db = createAppDb(
	auditOptions
		? auditConnection(connection, { ...auditOptions, isReadAudited: false })
		: connection,
);

// Reads too, for routes that opt in
export const auditedDb = auditOptions
	? createAppDb(auditConnection(connection, { ...auditOptions, isReadAudited: true }))
	: db;
