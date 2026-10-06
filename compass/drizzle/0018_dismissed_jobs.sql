CREATE TABLE `dismissed_jobs` (
	`user_id` integer NOT NULL,
	`dedupe_key` text NOT NULL,
	`reason` text,
	`at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `dedupe_key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dismissed_jobs_key_idx` ON `dismissed_jobs` (`dedupe_key`);