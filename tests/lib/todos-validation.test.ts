import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../database/schema";
import {
  createTodo,
  updateTodo,
  deleteTodo,
  getTodoById,
  type CreateTodoData,
} from "../../app/lib/todos";
import { ValidationError } from "../../app/lib/errors";

describe("todos.ts - Validation", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });

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

  describe("createTodo validation", () => {
    it("should throw ValidationError for empty title", async () => {
      const todoData: CreateTodoData = { title: "" };
      
      await expect(createTodo(db, todoData)).rejects.toThrow(ValidationError);
      await expect(createTodo(db, todoData)).rejects.toThrow("Title is required");
    });

    it("should throw ValidationError for whitespace-only title", async () => {
      const todoData: CreateTodoData = { title: "   " };
      
      await expect(createTodo(db, todoData)).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for title over 255 characters", async () => {
      const longTitle = "a".repeat(256);
      const todoData: CreateTodoData = { title: longTitle };
      
      await expect(createTodo(db, todoData)).rejects.toThrow(ValidationError);
      await expect(createTodo(db, todoData)).rejects.toThrow("Title must be 255 characters or less");
    });

    it("should throw ValidationError for description over 1000 characters", async () => {
      const longDescription = "a".repeat(1001);
      const todoData: CreateTodoData = { 
        title: "Valid title", 
        description: longDescription 
      };
      
      await expect(createTodo(db, todoData)).rejects.toThrow(ValidationError);
      await expect(createTodo(db, todoData)).rejects.toThrow("Description must be 1000 characters or less");
    });

    it("should throw ValidationError for invalid priority", async () => {
      const todoData: CreateTodoData = { 
        title: "Valid title", 
        priority: "invalid" as any 
      };
      
      await expect(createTodo(db, todoData)).rejects.toThrow(ValidationError);
      await expect(createTodo(db, todoData)).rejects.toThrow("Priority must be low, medium, or high");
    });

    it("should accept valid todo data", async () => {
      const todoData: CreateTodoData = {
        title: "Valid title",
        description: "Valid description",
        priority: "high"
      };
      
      const result = await createTodo(db, todoData);
      expect(result.title).toBe("Valid title");
      expect(result.description).toBe("Valid description");
      expect(result.priority).toBe("high");
    });

    it("should trim title and description", async () => {
      const todoData: CreateTodoData = {
        title: "  Padded title  ",
        description: "  Padded description  "
      };
      
      const result = await createTodo(db, todoData);
      expect(result.title).toBe("Padded title");
      expect(result.description).toBe("Padded description");
    });
  });

  describe("updateTodo validation", () => {
    it("should throw ValidationError for invalid ID", async () => {
      await expect(updateTodo(db, -1, { title: "New title" })).rejects.toThrow(ValidationError);
      await expect(updateTodo(db, 0, { title: "New title" })).rejects.toThrow(ValidationError);
      await expect(updateTodo(db, 1.5, { title: "New title" })).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for empty title", async () => {
      const todo = await createTodo(db, { title: "Original title" });
      
      await expect(updateTodo(db, todo.id, { title: "" })).rejects.toThrow(ValidationError);
      await expect(updateTodo(db, todo.id, { title: "   " })).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for title over 255 characters", async () => {
      const todo = await createTodo(db, { title: "Original title" });
      const longTitle = "a".repeat(256);
      
      await expect(updateTodo(db, todo.id, { title: longTitle })).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for description over 1000 characters", async () => {
      const todo = await createTodo(db, { title: "Original title" });
      const longDescription = "a".repeat(1001);
      
      await expect(updateTodo(db, todo.id, { description: longDescription })).rejects.toThrow(ValidationError);
    });

    it("should accept valid updates", async () => {
      const todo = await createTodo(db, { title: "Original title" });
      
      const result = await updateTodo(db, todo.id, {
        title: "Updated title",
        description: "Updated description",
        priority: "low"
      });
      
      expect(result!.title).toBe("Updated title");
      expect(result!.description).toBe("Updated description");
      expect(result!.priority).toBe("low");
    });
  });

  describe("deleteTodo validation", () => {
    it("should throw ValidationError for invalid ID", async () => {
      await expect(deleteTodo(db, -1)).rejects.toThrow(ValidationError);
      await expect(deleteTodo(db, 0)).rejects.toThrow(ValidationError);
      await expect(deleteTodo(db, 1.5)).rejects.toThrow(ValidationError);
    });
  });

  describe("getTodoById validation", () => {
    it("should throw ValidationError for invalid ID", async () => {
      await expect(getTodoById(db, -1)).rejects.toThrow(ValidationError);
      await expect(getTodoById(db, 0)).rejects.toThrow(ValidationError);
      await expect(getTodoById(db, 1.5)).rejects.toThrow(ValidationError);
    });
  });
});