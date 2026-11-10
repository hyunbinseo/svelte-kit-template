import { equal, ok } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { argv } from 'node:process';

// Run from the project root (`vpr`); needs no install there.
const deployRoot = argv[2];
ok(deployRoot);

// Untracked files included, so a release is one exact commit.
equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }), '');

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const releaseDir = join(deployRoot, 'releases', sha);

// Fails if the release exists
execFileSync('git', ['worktree', 'add', '--detach', releaseDir, sha], { stdio: 'inherit' });

// A copy, since static variables are inlined at build. Secrets don't go here.
if (existsSync('.env.production.local')) {
	copyFileSync('.env.production.local', join(releaseDir, '.env.production.local'));
}

execFileSync('vp', ['install', '--frozen-lockfile'], { cwd: releaseDir, stdio: 'inherit' });
execFileSync('vp', ['run', 'build'], { cwd: releaseDir, stdio: 'inherit' });

console.info(sha);
