CREATE TABLE `search_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`last_run_at` integer NOT NULL,
	`items` integer DEFAULT 0 NOT NULL
);
