import { relative } from 'node:path';
import { ROOT } from '#cli/shared.ts';
import { createAppDatabase } from '#db/app/server/database.ts';
import { createAuditDatabase } from '#db/audit/server/database.ts';
import { auditClient, type AuditContext } from '#db/audit/server/logger.ts';
import { isAuditEnabled, openDatabase, prepareDatabaseFile } from '#db/shared.server.ts';
import type { Mode } from '#lib/env.ts';

// Pass the script's import.meta.filename, logged where a request pathname would go.
export const openCliDatabases = ({
	dataDir,
	mode,
	scriptPath,
}: {
	dataDir: string;
	mode: Mode;
	scriptPath: string;
}) => {
	const client = openDatabase(prepareDatabaseFile(dataDir, mode, 'app'));

	const auditDb = isAuditEnabled(mode)
		? createAuditDatabase(openDatabase(prepareDatabaseFile(dataDir, mode, 'audit')))
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

	const db = createAppDatabase(
		auditOptions ? auditClient(client, { ...auditOptions, isReadAudited: false }) : client,
	);

	return {
		auditDb, // undefined in development
		auditedDb: auditOptions
			? createAppDatabase(auditClient(client, { ...auditOptions, isReadAudited: true }))
			: db,
		db,
		[Symbol.dispose]: () => {
			client.close();
			auditDb?.$client.close();
		},
	};
};
