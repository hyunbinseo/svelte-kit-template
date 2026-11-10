import { ok } from 'node:assert/strict';
import { existsSync, readlinkSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { argv } from 'node:process';

const deployRoot = argv[2];
const sha = argv[3];
ok(deployRoot);
ok(sha);

// Relative to the deploy root, like the links
const release = join('releases', sha);
ok(existsSync(join(deployRoot, release, 'build', basename(process.execPath))));

const currentPath = join(deployRoot, 'current');
const previousPath = join(deployRoot, 'previous');
const currentTempPath = join(deployRoot, 'current.tmp');
const previousTempPath = join(deployRoot, 'previous.tmp');

// Missing on the first activation
const currentRelease = existsSync(currentPath) ? readlinkSync(currentPath) : undefined;

// Its chunks stay reachable for pages it served, see specs/12-operations.md
if (currentRelease && currentRelease !== release) {
	rmSync(previousTempPath, { force: true });
	symlinkSync(currentRelease, previousTempPath);
	renameSync(previousTempPath, previousPath);
}

// Renamed over the old link, so `current` always exists
rmSync(currentTempPath, { force: true });
symlinkSync(release, currentTempPath);
renameSync(currentTempPath, currentPath);
