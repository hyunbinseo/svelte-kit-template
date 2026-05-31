CREATE TABLE `log` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`logged_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sub` text,
	`ip` text NOT NULL,
	`query_hash` text NOT NULL,
	`params` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `query` (
	`hash` text PRIMARY KEY,
	`sql` text NOT NULL
);
