import { ok } from 'node:assert/strict';
import { findPackageJSON } from 'node:module';
import { dirname } from 'node:path';
import { env } from 'node:process';
import { loadEnv } from 'vite';
import type { Mode } from '#lib/env.ts';

// The nearest package.json, which also maps #cli/*
const packageJsonPath = findPackageJSON(import.meta.url);
ok(packageJsonPath);

export const ROOT = dirname(packageJsonPath);

// Vite's env files and precedence; the process env wins over all.
export const loadModeEnv = (mode: Mode) => {
	Object.assign(env, loadEnv(mode, ROOT, ''));
};
