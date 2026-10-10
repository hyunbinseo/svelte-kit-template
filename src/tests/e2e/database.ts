import { rmSync } from 'node:fs';

export const removeDatabase = (filename: string) => {
	for (const suffix of ['', '-wal', '-shm']) rmSync(filename + suffix, { force: true });
};
