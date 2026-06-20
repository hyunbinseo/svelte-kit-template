import { root } from '#cli/utilities.ts';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd, env } from 'node:process';
import { build } from 'vite';

const BUILD_TIMESTAMP = Math.floor(Date.now() / 1000).toString();

if (cwd() !== root) throw new Error();

const outDir = `build/${BUILD_TIMESTAMP}`;
if (existsSync(resolve(root, outDir))) throw new Error();

env.SVELTE_KIT_BUILD_TIMESTAMP = BUILD_TIMESTAMP;
await build();

console.table({ outDir });
