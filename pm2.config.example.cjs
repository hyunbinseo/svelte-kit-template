// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolve } = require('node:path');

module.exports = {
	/** @type {import('pm2-ecosystem').StartOptions[]} */
	// See https://pm2.keymetrics.io/docs/usage/application-declaration
	apps: [
		{
			name: '<name>', // e.g. server, example.com
			script: './cli/scripts/start.ts',
			interpreter: 'node',
			exec_mode: 'cluster',
			interpreter_args: [
				`--env-file=${resolve(__dirname, '.env.production')}`,
				`--env-file=${resolve(__dirname, '.env.production.local')}`,
			],
			instances: -1,
			time: true,
			autorestart: true,
		},
		{
			name: '<name>:backup',
			script: './cli/scripts/backup.ts',
			interpreter: 'node',
			interpreter_args: '--env-file=.env.production --import ./cli/preload/sentry.ts',
			time: true,
			autorestart: false,
			cron: '0 0 * * *',
		},
	],
};
