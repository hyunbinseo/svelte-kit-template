// See https://pm2.keymetrics.io/docs/usage/application-declaration

module.exports = {
	/** @type {import('pm2-ecosystem').StartOptions[]} */
	apps: [
		{
			name: '<name>', // e.g. server, example.com
			script: './build/start.js',
			interpreter: 'node',
			instances: -1,
			exec_mode: 'cluster',
			time: true,
			autorestart: true,
		},
		{
			name: '<name>:backup',
			script: './cli/scripts/backup.ts',
			interpreter: 'node',
			interpreter_args: '--env-file=.env.production --import ./cli/scripts/sentry.ts',
			time: true,
			autorestart: false,
			cron: '0 0 * * *',
		},
	],
};
