/* eslint-disable @typescript-eslint/no-require-imports */
const { availableParallelism } = require('node:os');
const { resolve } = require('node:path');

module.exports = {
	/** @type {import('pm2-ecosystem').StartOptions[]} */
	// See https://pm2.keymetrics.io/docs/usage/application-declaration
	apps: [
		{
			name: '<name>', // e.g. server, example.com
			cwd: __dirname,
			script: './cli/prod/pm2/start.ts',
			exec_mode: 'cluster', // uses the PM2 daemon's runtime (ignores `interpreter`, `devEngines.runtime`)
			interpreter_args: [
				`--env-file=${resolve(__dirname, '.env.production')}`,
				`--env-file=${resolve(__dirname, '.env.production.local')}`,
			],
			instances: Math.max(2, availableParallelism() - 1), // min 2 for zero-downtime `pm2 reload`
			time: true,
			autorestart: true,
		},
		{
			name: '<name>:backup',
			cwd: __dirname,
			script: './cli/prod/pm2/backup.ts',
			interpreter: 'node',
			interpreter_args: '--env-file=.env.production --import ./cli/instrumentation.ts',
			time: true,
			autorestart: false,
			cron: '0 0 * * *',
		},
	],
};
