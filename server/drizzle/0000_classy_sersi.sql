CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`filetype` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cards_to_labels` (
	`card_id` integer NOT NULL,
	`label_id` integer NOT NULL,
	PRIMARY KEY(`card_id`, `label_id`),
	FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kanban_boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`project_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `kanban_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`column_id` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`assignee_id` integer,
	`priority_id` integer,
	`due_date` text,
	FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`priority_id`) REFERENCES `priorities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kanban_columns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`board_id` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `kanban_boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `labels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_name_unique` ON `labels` (`name`);--> statement-breakpoint
CREATE TABLE `priorities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`owner_id` integer,
	`team_id` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `users_to_teams` (
	`user_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `team_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
