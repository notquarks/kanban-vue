PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_kanban_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`column_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`assignee_id` text,
	`reporter_id` text NOT NULL,
	`priority_id` integer NOT NULL,
	`due_date` integer,
	`status` text DEFAULT 'todo' NOT NULL,
	`estimated_hours` integer,
	`actual_hours` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`priority_id`) REFERENCES `priorities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_kanban_cards`("id", "title", "description", "column_id", "order", "assignee_id", "reporter_id", "priority_id", "due_date", "status", "estimated_hours", "actual_hours", "created_at", "updated_at") SELECT "id", "title", "description", "column_id", "order", "assignee_id", "reporter_id", "priority_id", "due_date", "status", "estimated_hours", "actual_hours", "created_at", "updated_at" FROM `kanban_cards`;--> statement-breakpoint
DROP TABLE `kanban_cards`;--> statement-breakpoint
ALTER TABLE `__new_kanban_cards` RENAME TO `kanban_cards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`owner_id` text NOT NULL,
	`team_id` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "name", "description", "owner_id", "team_id", "status", "start_date", "end_date", "created_at", "updated_at") SELECT "id", "name", "description", "owner_id", "team_id", "status", "start_date", "end_date", "created_at", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`avatar` text,
	`status` text DEFAULT 'active' NOT NULL,
	`last_login_at` integer,
	`email_verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "email", "password_hash", "is_admin", "avatar", "status", "last_login_at", "email_verified_at", "created_at", "updated_at") SELECT "id", "name", "email", "password_hash", "is_admin", "avatar", "status", "last_login_at", "email_verified_at", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `attachments` ADD `filesize` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `attachments` ADD `uploaded_by` text NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `comments` ADD `parent_id` text REFERENCES comments(id);--> statement-breakpoint
ALTER TABLE `comments` ADD `is_edited` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `edited_at` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_boards` ADD `is_archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_boards` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_boards` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_columns` ADD `color` text;--> statement-breakpoint
ALTER TABLE `kanban_columns` ADD `max_cards` integer;--> statement-breakpoint
ALTER TABLE `kanban_columns` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_columns` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `labels` ADD `description` text;--> statement-breakpoint
ALTER TABLE `labels` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `labels` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `priorities` ADD `color` text NOT NULL;--> statement-breakpoint
ALTER TABLE `priorities` ADD `icon` text;--> statement-breakpoint
CREATE UNIQUE INDEX `priorities_level_unique` ON `priorities` (`level`);--> statement-breakpoint
ALTER TABLE `teams` ADD `description` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `updated_at` integer NOT NULL;