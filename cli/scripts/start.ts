import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env } from 'node:process';
import { root } from '#cli/lib/utilities.ts';

assert(env.BUILD_ID);

await import(resolve(root, 'build', env.BUILD_ID, 'index.js'));
