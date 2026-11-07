import { relative } from 'node:path';
import { ROOT } from '#cli/lib/shared.ts';
import { createAppDb } from '#db/app/drizzle.ts';
import { createAuditDb } from '#db/audit/drizzle.ts';
import { auditConnection, type AuditContext } from '#db/audit/logger.ts';
import { openConnection } from '#db/shared/connection.ts';
import { isAuditEnabled, prepareDatabasePath } from '#db/shared/database.ts';
import type { Mode } from '#lib/env.ts';

// Pass the script's import.meta.filename, logged where a request pathname would go.
export const openDbs = ({
	dataDir,
	mode,
	scriptPath,
}: {
	dataDir: string;
	mode: Mode;
	scriptPath: string;
}) => {
	const connection = openConnection(prepareDatabasePath(dataDir, mode, 'app'));

	const auditDb = isAuditEnabled(mode)
		? createAuditDb(openConnection(prepareDatabasePath(dataDir, mode, 'audit')))
		: undefined;

	// CLI operators are staff (개인정보취급자).
	const context: AuditContext = {
		byStaff: true,
		ip: null,
		pathname: relative(ROOT, scriptPath),
		userId: null,
	};

	const auditOptions = auditDb && {
		auditDb,
		getContext: () => context,
		report: console.error, // TODO Sentry, see specs/10-observability.md
	};

	const db = createAppDb(
		auditOptions
			? auditConnection(connection, { ...auditOptions, isReadAudited: false })
			: connection,
	);

	return {
		auditDb, // undefined in development
		auditedDb: auditOptions
			? createAppDb(auditConnection(connection, { ...auditOptions, isReadAudited: true }))
			: db,
		db,
		[Symbol.dispose]: () => {
			connection.close();
			auditDb?.$client.close();
		},
	};
};
