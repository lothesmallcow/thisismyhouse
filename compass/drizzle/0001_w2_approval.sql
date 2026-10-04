ALTER TABLE `approved_sites` ADD `approved_at` integer;--> statement-breakpoint
ALTER TABLE `approved_sites` ADD `robots_summary` text DEFAULT '' NOT NULL;