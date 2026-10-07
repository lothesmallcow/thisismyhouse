ALTER TABLE `jobs` ADD `facts` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `facts_version` integer DEFAULT 0 NOT NULL;