CREATE TABLE `login` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`contact` text NOT NULL,
	`user_id` integer,
	`code_hash` blob NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ip` text NOT NULL,
	`send_id` text,
	CONSTRAINT `fk_login_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
	CONSTRAINT "login_code_hash_check" CHECK(length("code_hash") = 32),
	CONSTRAINT "login_expires_at_check" CHECK("expires_at" > "created_at")
);
--> statement-breakpoint
CREATE TABLE `login_attempt` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`login_id` integer NOT NULL,
	`success` integer NOT NULL,
	`attempted_at` integer NOT NULL,
	`ip` text NOT NULL,
	CONSTRAINT `fk_login_attempt_login_id_login_id_fk` FOREIGN KEY (`login_id`) REFERENCES `login`(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`contact` text UNIQUE,
	`created_at` integer NOT NULL,
	`created_by` integer,
	`closed_at` integer,
	`closed_by` integer,
	`closed_reason` text,
	CONSTRAINT `fk_user_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_closed_by_user_id_fk` FOREIGN KEY (`closed_by`) REFERENCES `user`(`id`),
	CONSTRAINT "user_contact_check" CHECK(((("contact" is not null)) or (("closed_at" is not null)))),
	CONSTRAINT "user_closed_at_check" CHECK("closed_at" >= "created_at"),
	CONSTRAINT "user_closed_nullity_check" CHECK(((("closed_at" is null) = ("closed_reason" is null)) and (((("closed_by" is null)) or (("closed_at" is not null)))))),
	CONSTRAINT "user_closed_reason_check" CHECK((((("closed_reason" glob 'admin_*') or ("closed_reason" glob 'cascade_*') or ("closed_reason" glob 'system_*') or ("closed_reason" glob 'user_*') or (("closed_reason" is null)))) and ((("closed_reason" not glob 'admin_*') or (("closed_by" is not null)))) and ((("closed_reason" not glob 'system_*') or (("closed_by" is null))))))
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`user_id` integer PRIMARY KEY,
	`birth_date` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_user_profile_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
	CONSTRAINT "user_profile_birth_date_check" CHECK("birth_date" is date("birth_date"))
);
--> statement-breakpoint
CREATE TABLE `user_role` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`assigned_at` integer NOT NULL,
	`assigned_by` integer,
	`revoked_at` integer,
	`revoked_by` integer,
	`revoked_reason` text,
	CONSTRAINT `fk_user_role_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_role_assigned_by_user_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_role_revoked_by_user_id_fk` FOREIGN KEY (`revoked_by`) REFERENCES `user`(`id`),
	CONSTRAINT "user_role_revoked_at_check" CHECK("revoked_at" >= "assigned_at"),
	CONSTRAINT "user_role_revoked_nullity_check" CHECK(((("revoked_at" is null) = ("revoked_reason" is null)) and (((("revoked_by" is null)) or (("revoked_at" is not null)))))),
	CONSTRAINT "user_role_revoked_reason_check" CHECK((((("revoked_reason" glob 'admin_*') or ("revoked_reason" glob 'cascade_*') or ("revoked_reason" glob 'system_*') or ("revoked_reason" glob 'user_*') or (("revoked_reason" is null)))) and ((("revoked_reason" not glob 'admin_*') or (("revoked_by" is not null)))) and ((("revoked_reason" not glob 'system_*') or (("revoked_by" is null))))))
);
--> statement-breakpoint
CREATE TABLE `user_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`secret_hash` blob NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ip` text NOT NULL,
	`revoked_at` integer,
	`revoked_by` integer,
	`revoked_reason` text,
	CONSTRAINT `fk_user_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_session_revoked_by_user_id_fk` FOREIGN KEY (`revoked_by`) REFERENCES `user`(`id`),
	CONSTRAINT "user_session_secret_hash_check" CHECK(length("secret_hash") = 32),
	CONSTRAINT "user_session_expires_at_check" CHECK("expires_at" > "created_at"),
	CONSTRAINT "user_session_revoked_at_check" CHECK("revoked_at" >= "created_at"),
	CONSTRAINT "user_session_revoked_nullity_check" CHECK(((("revoked_at" is null) = ("revoked_reason" is null)) and (((("revoked_by" is null)) or (("revoked_at" is not null)))))),
	CONSTRAINT "user_session_revoked_reason_check" CHECK((((("revoked_reason" glob 'admin_*') or ("revoked_reason" glob 'cascade_*') or ("revoked_reason" glob 'system_*') or ("revoked_reason" glob 'user_*') or (("revoked_reason" is null)))) and ((("revoked_reason" not glob 'admin_*') or (("revoked_by" is not null)))) and ((("revoked_reason" not glob 'system_*') or (("revoked_by" is null))))))
);
--> statement-breakpoint
CREATE INDEX `login_contact_idx` ON `login` (`contact`);--> statement-breakpoint
CREATE INDEX `login_user_id_idx` ON `login` (`user_id`);--> statement-breakpoint
CREATE INDEX `login_attempt_login_id_idx` ON `login_attempt` (`login_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_role_active_unique` ON `user_role` (`user_id`,`role`) WHERE ("user_role"."revoked_at" is null);--> statement-breakpoint
CREATE INDEX `user_session_user_id_idx` ON `user_session` (`user_id`);