import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { execPath, exit } from 'node:process';

const root = resolve(import.meta.dirname, '../..');

const input: { tool_input?: { file_path?: string } } = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;

if (!file || !existsSync(file)) exit(0);
if (!realpathSync(file).startsWith(root + sep)) exit(0);

const run = (bin: string, args: string[]) =>
	spawnSync(execPath, [resolve(root, 'node_modules', bin), ...args, file], {
		cwd: root,
		stdio: ['ignore', 2, 2],
	});

const lint = run('eslint/bin/eslint.js', [
	'--fix',
	'--no-warn-ignored',
	'--no-error-on-unmatched-pattern',
]);

const format = run('oxfmt/bin/oxfmt', [
	'--write', //
	'--no-error-on-unmatched-pattern',
]);

if (lint.status !== 0 || format.status !== 0) exit(2);
