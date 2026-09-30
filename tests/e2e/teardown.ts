import { rmSync } from 'node:fs';
import { DATABASE_URL } from './env.ts';

export default () => rmSync(DATABASE_URL, { force: true });
