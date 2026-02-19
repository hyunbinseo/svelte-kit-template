import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd, env } from 'node:process';
import { build } from 'vite';
import { root } from './utilities.ts';

if (cwd() !== root) throw new Error();

const outDir = `build/${Math.floor(Date.now() / 1000)}`;

if (existsSync(resolve(root, `./${outDir}`))) throw new Error();

env.SVELTE_KIT_NODE_ADAPTER_OUT = outDir;
await build();

console.table({ outDir });
