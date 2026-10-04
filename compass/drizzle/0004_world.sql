ALTER TABLE `catalog_companies` ADD `source` text DEFAULT 'curato' NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_companies` ADD `country` text DEFAULT 'IT' NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_companies` ADD `region` text;--> statement-breakpoint
ALTER TABLE `catalog_companies` ADD `website` text;--> statement-breakpoint
ALTER TABLE `catalog_companies` ADD `industry` text;--> statement-breakpoint
ALTER TABLE `catalog_companies` ADD `size` integer;--> statement-breakpoint
CREATE INDEX `catalog_companies_source_idx` ON `catalog_companies` (`source`,`country`);--> statement-breakpoint
ALTER TABLE `catalog_sectors` ADD `source` text DEFAULT 'curato' NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_sectors` ADD `nace` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `countries` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `regions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `catalog_companies` SET `source` = 'altro' WHERE `created_by_user_id` IS NOT NULL;--> statement-breakpoint
UPDATE `catalog_sectors` SET `source` = 'altro' WHERE `created_by_user_id` IS NOT NULL;
