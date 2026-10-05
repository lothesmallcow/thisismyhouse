CREATE TABLE `mail_connections` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'gmail' NOT NULL,
	`email` text NOT NULL,
	`refresh_token_enc` text NOT NULL,
	`connected_at` integer NOT NULL,
	`last_read_at` integer,
	`last_error` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
