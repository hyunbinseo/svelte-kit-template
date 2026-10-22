import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	dbCredentials: { url: process.env.DATABASE_URL },
	dialect: 'sqlite',
	schema: './src/db/server/app/schema.ts',
	strict: true,
	verbose: true,
});
