CREATE TABLE `programme_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_key` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'programme' NOT NULL,
	`country` text,
	`source_host` text NOT NULL,
	`catalog_company_id` integer,
	`official_url` text,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`checked_at` integer,
	`found` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programme_leads_name_key_unique` ON `programme_leads` (`name_key`);--> statement-breakpoint
CREATE INDEX `programme_leads_checked_idx` ON `programme_leads` (`checked_at`);