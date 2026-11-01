CREATE TABLE `entry_sql` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`hash` blob NOT NULL UNIQUE,
	`sql` text NOT NULL,
	CONSTRAINT "entry_sql_hash_check" CHECK(length("hash") = 32)
);
--> statement-breakpoint
CREATE TABLE `entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`sql_id` integer NOT NULL,
	`params` text NOT NULL,
	`logged_at` integer NOT NULL,
	`user_id` integer,
	`ip` text,
	`pathname` text NOT NULL,
	`by_staff` integer NOT NULL,
	`failed` integer NOT NULL,
	CONSTRAINT `fk_entry_sql_id_entry_sql_id_fk` FOREIGN KEY (`sql_id`) REFERENCES `entry_sql`(`id`)
);
--> statement-breakpoint
CREATE INDEX `entry_by_staff_logged_at_idx` ON `entry` (`by_staff`,`logged_at`);