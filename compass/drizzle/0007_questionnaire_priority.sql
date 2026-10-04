ALTER TABLE `profile` ADD `onboarding_mode` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `priority` text DEFAULT 'media' NOT NULL;--> statement-breakpoint
UPDATE `profile` SET `onboarding_mode` = 'completo' WHERE `onboarded_at` IS NOT NULL OR `onboarding_step` > 1;
