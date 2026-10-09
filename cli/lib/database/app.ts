import assert from 'node:assert/strict';
import { env } from 'node:process';
import { captureException } from '@sentry/node';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { relations } from '#database/app/relations.ts';
import { createAuditLogger } from '#database/audit/logger.ts';
import { drizzleOptions, openDatabase } from '#database/connection.ts';
import { auditDb } from './audit.ts';

assert(env.DATABASE_APP_URL);

const logger = auditDb
	? createAuditLogger(
			auditDb, //
			(error) => {
				console.error(error);
				captureException(error);
			},
			() => ({ sub: null, ip: '', pathname: null }),
			{ scope: 'writes' },
		)
	: undefined;

export const appDb = drizzle({
	...drizzleOptions,
	client: openDatabase(env.DATABASE_APP_URL),
	logger,
	relations,
});
