CREATE TABLE `card_todos` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`title` text NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cards_to_members` (
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`card_id`, `user_id`),
	FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_kanban_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`column_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`reporter_id` text NOT NULL,
	`priority_id` integer NOT NULL,
	`due_date` integer,
	`status` text DEFAULT 'todo' NOT NULL,
	`estimated_hours` integer,
	`actual_hours` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`priority_id`) REFERENCES `priorities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_kanban_cards`("id", "title", "description", "column_id", "order", "reporter_id", "priority_id", "due_date", "status", "estimated_hours", "actual_hours", "created_at", "updated_at") SELECT "id", "title", "description", "column_id", "order", "reporter_id", "priority_id", "due_date", "status", "estimated_hours", "actual_hours", "created_at", "updated_at" FROM `kanban_cards`;--> statement-breakpoint
DROP TABLE `kanban_cards`;--> statement-breakpoint
ALTER TABLE `__new_kanban_cards` RENAME TO `kanban_cards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;