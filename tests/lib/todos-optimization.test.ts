import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../database/schema";
import {
  getAllTodos,
  createTodo,
  getTodoStats,
  getTodosByStatus,
  getTodosByPriority,
  searchTodos,
  bulkUpdateTodos,
  type TodoFilter,
  type TodoSort,
} from "../../app/lib/todos";

describe("todos.ts - Optimization Features", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(async () => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });

    // Create the todos table with indexes
    sqlite.exec(`
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT false NOT NULL,
        priority TEXT DEFAULT 'medium' NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      
      CREATE INDEX todos_created_at_idx ON todos (createdAt);
      CREATE INDEX todos_completed_idx ON todos (completed);
      CREATE INDEX todos_priority_idx ON todos (priority);
      CREATE INDEX todos_completed_created_at_idx ON todos (completed, createdAt);
    `);

    // Create sample data
    await Promise.all([
      createTodo(db, { title: "High priority task", priority: "high" }),
      createTodo(db, { title: "Medium priority task", priority: "medium" }),
      createTodo(db, { title: "Low priority task", priority: "low" }),
      createTodo(db, { title: "Completed task", priority: "high" }),
      createTodo(db, { title: "Search test task", description: "This contains searchable content", priority: "medium" }),
    ]);

    // Mark one todo as completed
    const todos = await getAllTodos(db);
    await db.update(schema.todos)
      .set({ completed: true })
      .where(eq(schema.todos.id, todos[3].id));
  });

  describe("getTodoStats", () => {
    it("should return correct statistics", async () => {
      const stats = await getTodoStats(db);

      expect(stats.total).toBe(5);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(4);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(2);
      expect(stats.byPriority.low).toBe(1);
    });
  });

  describe("getTodosByStatus", () => {
    it("should get completed todos", async () => {
      const completed = await getTodosByStatus(db, true);
      
      expect(completed).toHaveLength(1);
      expect(completed[0].completed).toBe(true);
    });

    it("should get pending todos", async () => {
      const pending = await getTodosByStatus(db, false);
      
      expect(pending).toHaveLength(4);
      expect(pending.every(todo => !todo.completed)).toBe(true);
    });
  });

  describe("getTodosByPriority", () => {
    it("should get todos by priority", async () => {
      const highPriority = await getTodosByPriority(db, "high");
      const mediumPriority = await getTodosByPriority(db, "medium");
      const lowPriority = await getTodosByPriority(db, "low");

      expect(highPriority).toHaveLength(2);
      expect(mediumPriority).toHaveLength(2);
      expect(lowPriority).toHaveLength(1);
      
      expect(highPriority.every(todo => todo.priority === "high")).toBe(true);
      expect(mediumPriority.every(todo => todo.priority === "medium")).toBe(true);
      expect(lowPriority.every(todo => todo.priority === "low")).toBe(true);
    });
  });

  describe("searchTodos", () => {
    it("should search in title and description", async () => {
      const results = await searchTodos(db, "search");
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain("Search");
    });

    it("should return empty array for empty search", async () => {
      const results = await searchTodos(db, "");
      
      expect(results).toHaveLength(0);
    });

    it("should return empty array for no matches", async () => {
      const results = await searchTodos(db, "nonexistent");
      
      expect(results).toHaveLength(0);
    });
  });

  describe("bulkUpdateTodos", () => {
    it("should update multiple todos", async () => {
      const allTodos = await getAllTodos(db);
      const todoIds = allTodos.slice(0, 3).map(todo => todo.id);
      
      const updatedCount = await bulkUpdateTodos(db, todoIds, { priority: "high" });
      
      expect(updatedCount).toBe(3);
    });

    it("should return 0 for empty ID array", async () => {
      const updatedCount = await bulkUpdateTodos(db, [], { priority: "low" });
      
      expect(updatedCount).toBe(0);
    });

    it("should throw ValidationError for invalid IDs", async () => {
      await expect(bulkUpdateTodos(db, [-1, 0, 1.5], { priority: "low" }))
        .rejects.toThrow("Invalid todo ID");
    });
  });
});