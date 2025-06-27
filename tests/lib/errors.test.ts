import { describe, it, expect } from "vitest";
import {
  TodoError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  getErrorMessage,
  isUniqueConstraintError
} from "../../app/lib/errors";

describe("errors.ts", () => {
  describe("TodoError", () => {
    it("should create TodoError with correct properties", () => {
      const error = new TodoError("Test message", "TEST_CODE", 400);
      
      expect(error.name).toBe("TodoError");
      expect(error.message).toBe("Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(400);
      expect(error instanceof Error).toBe(true);
    });

    it("should default to status code 500", () => {
      const error = new TodoError("Test message", "TEST_CODE");
      expect(error.statusCode).toBe(500);
    });
  });

  describe("ValidationError", () => {
    it("should create ValidationError with field", () => {
      const error = new ValidationError("Invalid title", "title");
      
      expect(error.name).toBe("ValidationError");
      expect(error.message).toBe("Invalid title");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe("title");
    });

    it("should create ValidationError without field", () => {
      const error = new ValidationError("Invalid data");
      
      expect(error.field).toBeUndefined();
    });
  });

  describe("NotFoundError", () => {
    it("should create NotFoundError with id", () => {
      const error = new NotFoundError("Todo", 123);
      
      expect(error.name).toBe("NotFoundError");
      expect(error.message).toBe("Todo with id 123 not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
    });

    it("should create NotFoundError without id", () => {
      const error = new NotFoundError("Todo");
      
      expect(error.message).toBe("Todo not found");
    });
  });

  describe("DatabaseError", () => {
    it("should create DatabaseError with original error", () => {
      const originalError = new Error("DB connection failed");
      const error = new DatabaseError("Database operation failed", originalError);
      
      expect(error.name).toBe("DatabaseError");
      expect(error.message).toBe("Database operation failed");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.stack).toBe(originalError.stack);
    });

    it("should create DatabaseError without original error", () => {
      const error = new DatabaseError("Database operation failed");
      
      expect(error.message).toBe("Database operation failed");
    });
  });

  describe("getErrorMessage", () => {
    it("should return message from TodoError", () => {
      const error = new ValidationError("Title is required");
      const message = getErrorMessage(error);
      
      expect(message).toBe("Title is required");
    });

    it("should return generic message for regular Error", () => {
      const error = new Error("Some random error");
      const message = getErrorMessage(error);
      
      expect(message).toBe("An unexpected error occurred");
    });

    it("should return generic message for unknown error", () => {
      const message = getErrorMessage("string error");
      
      expect(message).toBe("An unknown error occurred");
    });

    it("should return generic message for null", () => {
      const message = getErrorMessage(null);
      
      expect(message).toBe("An unknown error occurred");
    });
  });

  describe("isUniqueConstraintError", () => {
    it("should detect UNIQUE constraint error", () => {
      const error = new Error("UNIQUE constraint failed: table.column");
      
      expect(isUniqueConstraintError(error)).toBe(true);
    });

    it("should detect unique error", () => {
      const error = new Error("Column must be unique");
      
      expect(isUniqueConstraintError(error)).toBe(true);
    });

    it("should detect already exists error", () => {
      const error = new Error("Record already exists");
      
      expect(isUniqueConstraintError(error)).toBe(true);
    });

    it("should not detect non-unique errors", () => {
      const error = new Error("Some other database error");
      
      expect(isUniqueConstraintError(error)).toBe(false);
    });

    it("should not detect non-Error values", () => {
      expect(isUniqueConstraintError("string")).toBe(false);
      expect(isUniqueConstraintError(null)).toBe(false);
      expect(isUniqueConstraintError(undefined)).toBe(false);
    });
  });
});