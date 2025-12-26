import { defineConfig } from 'drizzle-kit';
import { env, loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

loadEnvFile(fileURLToPath(new URL('.env', import.meta.url)));

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: env.DATABASE_URL },
	casing: 'snake_case',
	strict: true,
	verbose: true,
});
