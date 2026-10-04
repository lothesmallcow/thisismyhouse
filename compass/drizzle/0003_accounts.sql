CREATE TABLE `catalog_companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`kind` text DEFAULT 'azienda' NOT NULL,
	`sector_id` integer,
	`extra_sector_ids` text DEFAULT '[]' NOT NULL,
	`themes` text DEFAULT '[]' NOT NULL,
	`city` text,
	`track` text DEFAULT 'tutti' NOT NULL,
	`note` text,
	`ats` text,
	`ats_slug` text,
	`created_by_user_id` integer,
	`shared` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`sector_id`) REFERENCES `catalog_sectors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_companies_slug_unique` ON `catalog_companies` (`slug`);--> statement-breakpoint
CREATE TABLE `catalog_sectors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`track` text DEFAULT 'tutti' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`themes` text DEFAULT '[]' NOT NULL,
	`created_by_user_id` integer,
	`shared` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_sectors_slug_unique` ON `catalog_sectors` (`slug`);--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text DEFAULT 'lavoro' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`city` text,
	`start_year` integer,
	`start_month` integer,
	`end_year` integer,
	`end_month` integer,
	`current` integer DEFAULT false NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'manuale' NOT NULL,
	`catalog_company_id` integer,
	`sector_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_company_id`) REFERENCES `catalog_companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sector_id`) REFERENCES `catalog_sectors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `experiences_user_idx` ON `experiences` (`user_id`);--> statement-breakpoint
CREATE TABLE `invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code_hash` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`expires_at` integer NOT NULL,
	`used_by_user_id` integer,
	`used_at` integer,
	`revoked` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_code_hash_unique` ON `invites` (`code_hash`);--> statement-breakpoint
CREATE TABLE `user_jobs` (
	`user_id` integer NOT NULL,
	`job_id` integer NOT NULL,
	`distance_km` real,
	`score` integer DEFAULT 0 NOT NULL,
	`level` text DEFAULT 'poco' NOT NULL,
	`reasons` text DEFAULT '[]' NOT NULL,
	`factors` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`dismiss_reason` text,
	`seen_at` integer,
	`preset_match` text,
	PRIMARY KEY(`user_id`, `job_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_jobs_list_idx` ON `user_jobs` (`user_id`,`level`,`status`);--> statement-breakpoint
-- Data: until now there was one person, so her ranking and actions become her rows in user_jobs.
INSERT INTO `user_jobs` (`user_id`, `job_id`, `distance_km`, `score`, `level`, `reasons`, `factors`, `status`, `dismiss_reason`, `seen_at`)
SELECT (SELECT min(`id`) FROM `users` WHERE `role` = 'user'), `id`, `distance_km`, `score`, `level`, `reasons`, `factors`, `status`, `dismiss_reason`, `seen_at` FROM `jobs` WHERE (SELECT min(`id`) FROM `users` WHERE `role` = 'user') IS NOT NULL;--> statement-breakpoint
CREATE TABLE `user_prefs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`ref_id` integer NOT NULL,
	`stance` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_prefs_unique` ON `user_prefs` (`user_id`,`kind`,`ref_id`);--> statement-breakpoint
DROP INDEX `jobs_level_idx`;--> statement-breakpoint
ALTER TABLE `jobs` ADD `job_type` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `eligibility` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `duration_months` integer;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `distance_km`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `score`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `level`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `reasons`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `factors`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `dismiss_reason`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `seen_at`;--> statement-breakpoint
ALTER TABLE `applications` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `applications_user_idx` ON `applications` (`user_id`,`status`);--> statement-breakpoint
ALTER TABLE `cvs` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `demo_inbox` ADD `mailbox_key` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `job_sources` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `notifications` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `outbox` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `profile` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `profile` ADD `track` text DEFAULT 'lavoro' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `focus` text DEFAULT 'tutte' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `focus_companies_only` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `tastes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `hide_below_min` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `university` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `degree` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `study_year` integer;--> statement-breakpoint
ALTER TABLE `profile` ADD `degree_years` integer;--> statement-breakpoint
ALTER TABLE `profile` ADD `graduation_year` integer;--> statement-breakpoint
ALTER TABLE `profile` ADD `periods` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `extra_places` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `paid_only` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `profile_user_idx` ON `profile` (`user_id`);--> statement-breakpoint
ALTER TABLE `rank_adjustments` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `replies` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `send_log` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `spontaneous_companies` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `templates` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mailbox_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `digest_email` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_login_at` integer;--> statement-breakpoint
-- Data: everything that belonged to the single person now carries her account id.
UPDATE `users` SET `mailbox_key` = 'default' WHERE `id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user');--> statement-breakpoint
UPDATE `profile` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `applications` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `cvs` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `templates` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `spontaneous_companies` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `rank_adjustments` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `replies` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `send_log` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `outbox` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `notifications` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE `audience` = 'user' AND `user_id` IS NULL;--> statement-breakpoint
-- Her own alert e-mails and her manual additions stay private to her; API/ATS/web finds are shared.
UPDATE `job_sources` SET `user_id` = (SELECT min(`id`) FROM `users` WHERE `role` = 'user') WHERE (`source` LIKE 'email:%' OR `source` = 'manual') AND `user_id` IS NULL;--> statement-breakpoint
-- Her stop switch, autopilot and go-live date become per-person settings.
INSERT OR IGNORE INTO `settings` (`key`, `value`)
SELECT 'user:' || (SELECT min(`id`) FROM `users` WHERE `role` = 'user'), json_object(
  'killSwitch', CASE WHEN json_extract(`value`, '$.killSwitch') THEN json('true') ELSE json('false') END,
  'autopilot', CASE WHEN json_extract(`value`, '$.autopilot') THEN json('true') ELSE json('false') END,
  'goLiveAt', json_extract(`value`, '$.goLiveAt'),
  'lastDigestDay', (SELECT json_extract(`value`, '$') FROM `settings` WHERE `key` = 'lastDigestDay')
) FROM `settings` WHERE `key` = 'guardrails' AND (SELECT min(`id`) FROM `users` WHERE `role` = 'user') IS NOT NULL;
