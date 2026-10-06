ALTER TABLE `jobs` ADD `closes_at` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `opens_at` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `runs_start` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `runs_end` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `runs_month_only` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `rolling` integer DEFAULT false NOT NULL;