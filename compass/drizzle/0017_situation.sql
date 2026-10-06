ALTER TABLE `profile` ADD `situation` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `years_experience` integer;--> statement-breakpoint
ALTER TABLE `profile` ADD `current_role` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `notice_period` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `activities` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `work_rights` text DEFAULT '["UE"]' NOT NULL;