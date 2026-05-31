CREATE TABLE `log` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`logged_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sub` text,
	`ip` text NOT NULL,
	`message` text NOT NULL
);
