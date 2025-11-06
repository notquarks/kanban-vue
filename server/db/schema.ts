import { int, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: int("is_admin", { mode: "boolean" }).notNull().default(false),
  avatar: text("avatar"),
  status: text("status").notNull().default("active"),
  lastLoginAt: int("last_login_at", { mode: "timestamp" }),
  emailVerifiedAt: int("email_verified_at", { mode: "timestamp" }),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const teamsTable = sqliteTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  avatar: text("avatar"),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const prioritiesTable = sqliteTable("priorities", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  level: int("level").notNull().unique(),
  color: text("color").notNull(),
  icon: text("icon"),
});

export const labelsTable = sqliteTable("labels", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
  description: text("description"),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const usersToTeamsTable = sqliteTable("users_to_teams", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  teamId: text("team_id").notNull().references(() => teamsTable.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.teamId] }),
}));

export const projectsTable = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id").notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  teamId: text("team_id").references(() => teamsTable.id, { onDelete: 'set null' }),
  status: text("status").notNull().default("planning"),
  startDate: int("start_date", { mode: "timestamp" }),
  endDate: int("end_date", { mode: "timestamp" }),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const kanbanBoardsTable = sqliteTable("kanban_boards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: 'cascade' }),
  isArchived: int("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const kanbanColumnsTable = sqliteTable("kanban_columns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  boardId: text("board_id").notNull().references(() => kanbanBoardsTable.id, { onDelete: 'cascade' }),
  order: int("order").notNull().default(0),
  color: text("color"),
  maxCards: int("max_cards"),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const kanbanCardsTable = sqliteTable("kanban_cards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  columnId: text("column_id").notNull().references(() => kanbanColumnsTable.id, { onDelete: 'cascade' }),
  order: int("order").notNull().default(0),
  assigneeId: text("assignee_id").references(() => usersTable.id, { onDelete: 'set null' }),
  reporterId: text("reporter_id").notNull().references(() => usersTable.id),
  priorityId: int("priority_id").notNull().references(() => prioritiesTable.id),
  dueDate: int("due_date", { mode: "timestamp" }),
  status: text("status").notNull().default("todo"),
  estimatedHours: int("estimated_hours"),
  actualHours: int("actual_hours"),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const cardsToLabelsTable = sqliteTable("cards_to_labels", {
  cardId: text("card_id").notNull().references(() => kanbanCardsTable.id, { onDelete: 'cascade' }),
  labelId: text("label_id").notNull().references(() => labelsTable.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.cardId, table.labelId] }),
}));

export const attachmentsTable = sqliteTable("attachments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId: text("card_id").notNull().references(() => kanbanCardsTable.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  filetype: text("filetype"),
  filesize: int("filesize").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => usersTable.id),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const commentsTable = sqliteTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId: text("card_id").notNull().references(() => kanbanCardsTable.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  parentId: text("parent_id").references(() => commentsTable.id, { onDelete: 'cascade' }),
  isEdited: int("is_edited", { mode: "boolean" }).notNull().default(false),
  editedAt: int("edited_at", { mode: "timestamp" }),
  createdAt: int("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
