CREATE TABLE `login_attempt` (
	`id` integer PRIMARY KEY,
	`login_id` text NOT NULL,
	`is_successful` integer NOT NULL,
	`attempted_at` integer NOT NULL,
	`ip` text NOT NULL,
	CONSTRAINT `fk_login_attempt_login_id_login_id_fk` FOREIGN KEY (`login_id`) REFERENCES `login`(`id`)
);
--> statement-breakpoint
CREATE TABLE `login` (
	`id` text PRIMARY KEY,
	`send_id` text NOT NULL UNIQUE,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip` text NOT NULL,
	CONSTRAINT `fk_login_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `token_ban` (
	`token_id` text PRIMARY KEY,
	`type` text NOT NULL,
	`effective_at` integer NOT NULL,
	`banned_at` integer NOT NULL,
	`banned_by` text NOT NULL,
	`ip` text NOT NULL,
	CONSTRAINT `fk_token_ban_token_id_token_id_fk` FOREIGN KEY (`token_id`) REFERENCES `token`(`id`),
	CONSTRAINT `fk_token_ban_banned_by_user_id_fk` FOREIGN KEY (`banned_by`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `token` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`issued_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ip` text NOT NULL,
	CONSTRAINT `fk_token_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY,
	`birth` text NOT NULL,
	CONSTRAINT `fk_user_profile_id_user_id_fk` FOREIGN KEY (`id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_role` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`assigned_by` text NOT NULL,
	`revoked_at` integer,
	`revoked_by` text,
	CONSTRAINT `fk_user_role_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_role_assigned_by_user_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_role_revoked_by_user_id_fk` FOREIGN KEY (`revoked_by`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`contact` text NOT NULL,
	`created_by` text,
	`deactivated_at` integer,
	`deactivated_by` text,
	CONSTRAINT `fk_user_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_deactivated_by_user_id_fk` FOREIGN KEY (`deactivated_by`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE INDEX `login_attempt_login_id_idx` ON `login_attempt` (`login_id`);--> statement-breakpoint
CREATE INDEX `login_user_id_idx` ON `login` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_role_user_id_idx` ON `user_role` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `active_user_role_user_id_role_idx` ON `user_role` (`user_id`,`role`) WHERE ("user_role"."revoked_at" is null);--> statement-breakpoint
CREATE UNIQUE INDEX `active_user_contact_idx` ON `user` (`contact`) WHERE ("user"."deactivated_at" is null);