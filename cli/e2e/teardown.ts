import { rmSync } from 'node:fs';
import { DATABASE_URL } from '#cli/e2e/env.ts';

export default () => rmSync(DATABASE_URL, { force: true });
