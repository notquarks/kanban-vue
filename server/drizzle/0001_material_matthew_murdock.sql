PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`filetype` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attachments`("id", "card_id", "url", "filename", "filetype", "created_at") SELECT "id", "card_id", "url", "filename", "filetype", "created_at" FROM `attachments`;--> statement-breakpoint
DROP TABLE `attachments`;--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_cards_to_labels` (
	`card_id` text NOT NULL,
	`label_id` text NOT NULL,
	PRIMARY KEY(`card_id`, `label_id`),
	FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cards_to_labels`("card_id", "label_id") SELECT "card_id", "label_id" FROM `cards_to_labels`;--> statement-breakpoint
DROP TABLE `cards_to_labels`;--> statement-breakpoint
ALTER TABLE `__new_cards_to_labels` RENAME TO `cards_to_labels`;--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_comments`("id", "card_id", "user_id", "content", "created_at") SELECT "id", "card_id", "user_id", "content", "created_at" FROM `comments`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;--> statement-breakpoint
CREATE TABLE `__new_kanban_boards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`project_id` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_kanban_boards`("id", "name", "project_id") SELECT "id", "name", "project_id" FROM `kanban_boards`;--> statement-breakpoint
DROP TABLE `kanban_boards`;--> statement-breakpoint
ALTER TABLE `__new_kanban_boards` RENAME TO `kanban_boards`;--> statement-breakpoint
CREATE TABLE `__new_kanban_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`column_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`assignee_id` text,
	`priority_id` integer,
	`due_date` text,
	FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`priority_id`) REFERENCES `priorities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_kanban_cards`("id", "title", "description", "column_id", "order", "assignee_id", "priority_id", "due_date") SELECT "id", "title", "description", "column_id", "order", "assignee_id", "priority_id", "due_date" FROM `kanban_cards`;--> statement-breakpoint
DROP TABLE `kanban_cards`;--> statement-breakpoint
ALTER TABLE `__new_kanban_cards` RENAME TO `kanban_cards`;--> statement-breakpoint
CREATE TABLE `__new_kanban_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`board_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `kanban_boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_kanban_columns`("id", "name", "board_id", "order") SELECT "id", "name", "board_id", "order" FROM `kanban_columns`;--> statement-breakpoint
DROP TABLE `kanban_columns`;--> statement-breakpoint
ALTER TABLE `__new_kanban_columns` RENAME TO `kanban_columns`;--> statement-breakpoint
CREATE TABLE `__new_labels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_labels`("id", "name", "color") SELECT "id", "name", "color" FROM `labels`;--> statement-breakpoint
DROP TABLE `labels`;--> statement-breakpoint
ALTER TABLE `__new_labels` RENAME TO `labels`;--> statement-breakpoint
CREATE UNIQUE INDEX `labels_name_unique` ON `labels` (`name`);--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`owner_id` text,
	`team_id` text,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "name", "description", "owner_id", "team_id") SELECT "id", "name", "description", "owner_id", "team_id" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE TABLE `__new_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "name") SELECT "id", "name" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "email") SELECT "id", "name", "email" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `__new_users_to_teams` (
	`user_id` text NOT NULL,
	`team_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `team_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_users_to_teams`("user_id", "team_id") SELECT "user_id", "team_id" FROM `users_to_teams`;--> statement-breakpoint
DROP TABLE `users_to_teams`;--> statement-breakpoint
ALTER TABLE `__new_users_to_teams` RENAME TO `users_to_teams`;