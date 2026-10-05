ALTER TABLE `jobs` ADD `country` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `region` text;--> statement-breakpoint
CREATE INDEX `jobs_country_idx` ON `jobs` (`country`,`region`);