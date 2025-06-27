import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../database/schema";
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodoComplete,
  type CreateTodoData,
  type UpdateTodoData,
} from "../../app/lib/todos";

describe("todos.ts", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(() => {
    // Create in-memory SQLite database for testing
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });

    // Create the todos table
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
    `);
  });

  describe("createTodo", () => {
    it("should create a todo with required fields", async () => {
      const todoData: CreateTodoData = {
        title: "Test Todo",
      };

      const result = await createTodo(db, todoData);

      expect(result).toBeDefined();
      expect(result.title).toBe("Test Todo");
      expect(result.description).toBeNull();
      expect(result.completed).toBe(false);
      expect(result.priority).toBe("medium");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a todo with all fields", async () => {
      const todoData: CreateTodoData = {
        title: "High Priority Todo",
        description: "This is a test description",
        priority: "high",
      };

      const result = await createTodo(db, todoData);

      expect(result.title).toBe("High Priority Todo");
      expect(result.description).toBe("This is a test description");
      expect(result.priority).toBe("high");
    });
  });

  describe("getAllTodos", () => {
    it("should return empty array when no todos exist", async () => {
      const result = await getAllTodos(db);
      expect(result).toEqual([]);
    });

    it("should return all todos ordered by creation date", async () => {
      // Create multiple todos
      const first = await createTodo(db, { title: "First Todo" });
      const second = await createTodo(db, { title: "Second Todo" });
      const third = await createTodo(db, { title: "Third Todo" });

      const result = await getAllTodos(db);

      expect(result).toHaveLength(3);
      // Verify that all todos are returned
      const titles = result.map(todo => todo.title);
      expect(titles).toContain("First Todo");
      expect(titles).toContain("Second Todo");
      expect(titles).toContain("Third Todo");
      
      // Verify they are ordered (the actual order depends on the database implementation)
      // For better-sqlite3, the order is ascending by default
      expect(result[0].id).toBeLessThan(result[1].id);
      expect(result[1].id).toBeLessThan(result[2].id);
    });
  });

  describe("getTodoById", () => {
    it("should return null when todo does not exist", async () => {
      const result = await getTodoById(db, 999);
      expect(result).toBeNull();
    });

    it("should return todo when it exists", async () => {
      const created = await createTodo(db, { title: "Test Todo" });
      const result = await getTodoById(db, created.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
      expect(result!.title).toBe("Test Todo");
    });
  });

  describe("updateTodo", () => {
    it("should update todo fields", async () => {
      const created = await createTodo(db, { title: "Original Title" });
      
      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const updateData: UpdateTodoData = {
        title: "Updated Title",
        description: "Updated description",
        priority: "high",
      };

      const result = await updateTodo(db, created.id, updateData);

      expect(result).toBeDefined();
      expect(result!.title).toBe("Updated Title");
      expect(result!.description).toBe("Updated description");
      expect(result!.priority).toBe("high");
      expect(result!.updatedAt.getTime()).toBeGreaterThanOrEqual(result!.createdAt.getTime());
    });

    it("should return null when todo does not exist", async () => {
      const result = await updateTodo(db, 999, { title: "Non-existent" });
      expect(result).toBeNull();
    });

    it("should toggle completed status", async () => {
      const created = await createTodo(db, { title: "Test Todo" });
      expect(created.completed).toBe(false);

      const updated = await updateTodo(db, created.id, { completed: true });
      expect(updated!.completed).toBe(true);
    });
  });

  describe("deleteTodo", () => {
    it("should delete existing todo", async () => {
      const created = await createTodo(db, { title: "To Delete" });
      
      const result = await deleteTodo(db, created.id);
      expect(result).toBe(true);

      // Verify todo is deleted
      const found = await getTodoById(db, created.id);
      expect(found).toBeNull();
    });

    it("should return false when todo does not exist", async () => {
      const result = await deleteTodo(db, 999);
      expect(result).toBe(false);
    });
  });

  describe("toggleTodoComplete", () => {
    it("should toggle completed status from false to true", async () => {
      const created = await createTodo(db, { title: "Test Todo" });
      expect(created.completed).toBe(false);

      const result = await toggleTodoComplete(db, created.id);
      expect(result!.completed).toBe(true);
    });

    it("should toggle completed status from true to false", async () => {
      const created = await createTodo(db, { title: "Test Todo" });
      await updateTodo(db, created.id, { completed: true });

      const result = await toggleTodoComplete(db, created.id);
      expect(result!.completed).toBe(false);
    });

    it("should return null when todo does not exist", async () => {
      const result = await toggleTodoComplete(db, 999);
      expect(result).toBeNull();
    });
  });
});