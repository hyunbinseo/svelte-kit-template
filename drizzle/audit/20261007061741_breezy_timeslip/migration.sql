CREATE TABLE `log` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`logged_at` integer NOT NULL,
	`sub` text,
	`ip` text,
	`pathname` text,
	`query_hash` text NOT NULL,
	`params` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `query` (
	`hash` text PRIMARY KEY,
	`sql` text NOT NULL
);
