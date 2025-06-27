import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const guestBook = sqliteTable("guestBook", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
});

export const todos = sqliteTable("todos", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text(),
  completed: integer({ mode: "boolean" }).notNull().default(false),
  priority: text({ enum: ["low", "medium", "high"] }).notNull().default("medium"),
  createdAt: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Index for ordering by creation date (most common query)
  createdAtIdx: index("todos_created_at_idx").on(table.createdAt),
  // Index for filtering by completion status
  completedIdx: index("todos_completed_idx").on(table.completed),
  // Index for filtering by priority
  priorityIdx: index("todos_priority_idx").on(table.priority),
  // Composite index for completed + createdAt (common combination)
  completedCreatedAtIdx: index("todos_completed_created_at_idx").on(table.completed, table.createdAt),
}));
