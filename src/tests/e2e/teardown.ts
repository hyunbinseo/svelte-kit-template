import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { env } from 'node:process';

export default () => {
	assert(env.DATABASE_URL);
	rmSync(env.DATABASE_URL, { force: true });
};
