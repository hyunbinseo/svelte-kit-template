import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const root = join(import.meta.dirname, '..');

if (!existsSync(join(root, 'package.json'))) throw new Error();
