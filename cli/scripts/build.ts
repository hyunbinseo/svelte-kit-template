import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd, env } from 'node:process';
import { build } from 'vite';
import { root } from '#cli/lib/utilities.ts';

const BUILD_TIMESTAMP = Math.floor(Date.now() / 1000).toString();

assert.equal(cwd(), root);

const outDir = `build/${BUILD_TIMESTAMP}`;
assert(!existsSync(resolve(root, outDir)));

env.SVELTE_KIT_BUILD_TIMESTAMP = BUILD_TIMESTAMP;
await build();

console.table({ BUILD_ID: BUILD_TIMESTAMP });
