CREATE TABLE `dismissed_urls` (
	`user_id` integer NOT NULL,
	`url` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `url`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dismissed_urls_url_idx` ON `dismissed_urls` (`url`);--> statement-breakpoint
ALTER TABLE `dismissed_jobs` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `dismissed_jobs` ADD `company` text;--> statement-breakpoint
ALTER TABLE `dismissed_jobs` ADD `city` text;