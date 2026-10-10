import assert from 'node:assert/strict';
import { env } from 'node:process';
import { removeDatabase } from './database.ts';

export default () => {
	assert(env.DATABASE_APP_URL);
	removeDatabase(env.DATABASE_APP_URL);
};
