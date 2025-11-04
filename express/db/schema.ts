import { int, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
})

export const teamsTable = sqliteTable("teams", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const prioritiesTable = sqliteTable("priorities", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // e.g., "Low", "Medium", "High", "Urgent"
  level: int("level").notNull(), // e.g., 0, 1, 2, 3 for sorting
});

export const labelsTable = sqliteTable("labels", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull(), // e.g., a hex code like '#ff0000'
});

export const usersToTeamsTable = sqliteTable("users_to_teams", {
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  teamId: int("team_id").notNull().references(() => teamsTable.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.teamId] }),
}));

export const projectsTable = sqliteTable("projects", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: int("owner_id").references(() => usersTable.id),
  teamId: int("team_id").references(() => teamsTable.id),
});

export const kanbanBoardsTable = sqliteTable("kanban_boards", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  projectId: int("project_id").notNull().references(() => projectsTable.id, { onDelete: 'cascade' }),
});

export const kanbanColumnsTable = sqliteTable("kanban_columns", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  boardId: int("board_id").notNull().references(() => kanbanBoardsTable.id, { onDelete: 'cascade' }),
  order: int("order").notNull().default(0),
});

export const kanbanCardsTable = sqliteTable("kanban_cards", {
  id: int("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  columnId: int("column_id").notNull().references(() => kanbanColumnsTable.id, { onDelete: 'cascade' }),
  order: int("order").notNull().default(0),
  assigneeId: int("assignee_id").references(() => usersTable.id),
  priorityId: int("priority_id").references(() => prioritiesTable.id),
  dueDate: text("due_date"),
});

// Junction table for many-to-many relationship between cards and labels
export const cardsToLabelsTable = sqliteTable("cards_to_labels", {
  cardId: int("card_id").notNull().references(() => kanbanCardsTable.id, { onDelete: 'cascade' }),
  labelId: int("label_id").notNull().references(() => labelsTable.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.cardId, table.labelId] }),
}));

// One-to-many table for card attachments
export const attachmentsTable = sqliteTable("attachments", {
  id: int("id").primaryKey({ autoIncrement: true }),
  cardId: int("card_id").notNull().references(() => kanbanCardsTable.id, { onDelete: 'cascade' }),
  url: text("url").notNull(), // URL to the file in cloud storage or on a file server
  filename: text("filename").notNull(),
  filetype: text("filetype"),
  createdAt: int("created_at", { mode: 'timestamp' }).notNull(),
});

// One-to-many table for card comments
export const commentsTable = sqliteTable("comments", {
  id: int("id").primaryKey({ autoIncrement: true }),
  cardId: int("card_id").notNull().references(() => kanbanCardsTable.id, { onDelete: 'cascade' }),
  userId: int("user_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: int("created_at", { mode: 'timestamp' }).notNull(),
});
