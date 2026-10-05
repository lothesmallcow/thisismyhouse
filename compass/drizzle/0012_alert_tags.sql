ALTER TABLE `users` ADD `alert_tag` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_alert_tag_unique` ON `users` (`alert_tag`);