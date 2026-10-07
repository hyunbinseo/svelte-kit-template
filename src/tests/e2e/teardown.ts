import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { env } from 'node:process';

export default () => {
	assert(env.DATABASE_APP_URL);
	rmSync(env.DATABASE_APP_URL, { force: true });
};
