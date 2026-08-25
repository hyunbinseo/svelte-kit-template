import { resolve } from 'node:path';
import { env } from 'node:process';
import { root } from '#cli/lib/utilities.ts';

if (!env.BUILD_ID) throw new Error();

await import(resolve(root, 'build', env.BUILD_ID, 'index.js'));
