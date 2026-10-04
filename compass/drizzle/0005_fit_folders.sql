CREATE TABLE `folder_items` (
	`folder_id` integer NOT NULL,
	`job_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`folder_id`, `job_id`),
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `folder_items_user_idx` ON `folder_items` (`user_id`,`job_id`);--> statement-breakpoint
CREATE TABLE `folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `folders_user_idx` ON `folders` (`user_id`);--> statement-breakpoint
ALTER TABLE `profile` ADD `fit_weights` text;--> statement-breakpoint
ALTER TABLE `user_jobs` ADD `fit` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_jobs` ADD `parts` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX `user_jobs_fit_idx` ON `user_jobs` (`user_id`,`fit`);