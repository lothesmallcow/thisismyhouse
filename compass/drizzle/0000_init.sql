CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer,
	`spontaneous_company_id` integer,
	`lane` text NOT NULL,
	`mode` text DEFAULT 'manual' NOT NULL,
	`status` text NOT NULL,
	`company` text,
	`role` text,
	`to_email` text,
	`subject` text,
	`body` text,
	`cv_id` integer,
	`template_id` integer,
	`warnings` text DEFAULT '[]' NOT NULL,
	`send_at` integer,
	`sent_at` integer,
	`message_id` text,
	`simulated` integer DEFAULT false NOT NULL,
	`last_error` text,
	`reply_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`spontaneous_company_id`) REFERENCES `spontaneous_companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cv_id`) REFERENCES `cvs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `applications_job_idx` ON `applications` (`job_id`);--> statement-breakpoint
CREATE TABLE `approved_sites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`start_url` text NOT NULL,
	`terms_summary` text DEFAULT '' NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `blocklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_watchlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`ats` text NOT NULL,
	`slug` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cvs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`role_family` text NOT NULL,
	`filename` text NOT NULL,
	`mime` text DEFAULT 'application/pdf' NOT NULL,
	`size` integer NOT NULL,
	`data` blob NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_inbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`raw` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_inbox_message_id_unique` ON `demo_inbox` (`message_id`);--> statement-breakpoint
CREATE TABLE `http_cache` (
	`url` text PRIMARY KEY NOT NULL,
	`etag` text,
	`last_modified` text,
	`body` text,
	`status` integer NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`ok` integer,
	`summary` text
);
--> statement-breakpoint
CREATE TABLE `job_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`source` text NOT NULL,
	`url` text,
	`external_id` text,
	`seen_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_sources_job_idx` ON `job_sources` (`job_id`);--> statement-breakpoint
CREATE INDEX `job_sources_url_idx` ON `job_sources` (`url`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dedupe_key` text NOT NULL,
	`title` text NOT NULL,
	`company` text,
	`city` text,
	`province` text,
	`lat` real,
	`lng` real,
	`distance_km` real,
	`description` text DEFAULT '' NOT NULL,
	`salary_raw` text,
	`salary_min` integer,
	`salary_max` integer,
	`salary_basis` text DEFAULT 'unknown' NOT NULL,
	`salary_is_estimate` integer DEFAULT false NOT NULL,
	`salary_note` text,
	`contract` text DEFAULT 'unknown' NOT NULL,
	`hours` text DEFAULT 'unknown' NOT NULL,
	`remote` text DEFAULT 'unknown' NOT NULL,
	`languages` text DEFAULT '[]' NOT NULL,
	`sector` text,
	`application_email` text,
	`application_email_evidence` text,
	`scam_flags` text DEFAULT '[]' NOT NULL,
	`thin` integer DEFAULT false NOT NULL,
	`posted_at` integer,
	`first_seen_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`level` text DEFAULT 'poco' NOT NULL,
	`reasons` text DEFAULT '[]' NOT NULL,
	`factors` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`dismiss_reason` text,
	`seen_at` integer
);
--> statement-breakpoint
CREATE INDEX `jobs_level_idx` ON `jobs` (`level`,`status`);--> statement-breakpoint
CREATE INDEX `jobs_dedupe_idx` ON `jobs` (`dedupe_key`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audience` text NOT NULL,
	`text` text NOT NULL,
	`href` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`to_email` text NOT NULL,
	`subject` text NOT NULL,
	`text` text NOT NULL,
	`html` text,
	`attachment_name` text,
	`message_id` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `processed_messages` (
	`message_id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`parser` text,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`linkedin_url` text DEFAULT '' NOT NULL,
	`roles` text DEFAULT '[]' NOT NULL,
	`synonyms` text DEFAULT '[]' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`lat` real,
	`lng` real,
	`max_km` integer DEFAULT 20 NOT NULL,
	`remote_ok` integer DEFAULT true NOT NULL,
	`hours` text DEFAULT 'any' NOT NULL,
	`contracts` text DEFAULT '[]' NOT NULL,
	`min_net_monthly` integer,
	`min_gross_annual_estimate` integer,
	`languages` text DEFAULT '[]' NOT NULL,
	`avoid_sectors` text DEFAULT '[]' NOT NULL,
	`avoid_companies` text DEFAULT '[]' NOT NULL,
	`avoid_keywords` text DEFAULT '[]' NOT NULL,
	`presentation` text DEFAULT '' NOT NULL,
	`availability` text DEFAULT '' NOT NULL,
	`salary_expectation` text DEFAULT '' NOT NULL,
	`onboarding_step` integer DEFAULT 1 NOT NULL,
	`onboarded_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `rank_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`from_job_id` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer,
	`from_email` text NOT NULL,
	`from_name` text,
	`subject` text NOT NULL,
	`snippet` text DEFAULT '' NOT NULL,
	`matched_by` text NOT NULL,
	`suggested_status` text,
	`confirmed` integer DEFAULT false NOT NULL,
	`dismissed` integer DEFAULT false NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `send_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer,
	`to_email` text NOT NULL,
	`company` text,
	`role` text,
	`cv_label` text,
	`template_name` text,
	`status` text NOT NULL,
	`detail` text,
	`at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_health` (
	`source` text PRIMARY KEY NOT NULL,
	`last_run_at` integer,
	`last_success_at` integer,
	`items_found` integer DEFAULT 0 NOT NULL,
	`total_found` integer DEFAULT 0 NOT NULL,
	`parse_failures` integer DEFAULT 0 NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`blocks` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`paused_until` integer
);
--> statement-breakpoint
CREATE TABLE `spontaneous_companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`source_url` text NOT NULL,
	`city` text,
	`notes` text,
	`status` text DEFAULT 'approved' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `usage_counters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`counter` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usage_counter_day` ON `usage_counters` (`counter`,`day`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);