export class TodoError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "TodoError";
  }
}

export class ValidationError extends TodoError {
  constructor(message: string, public field?: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends TodoError {
  constructor(resource: string, id?: number) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      "NOT_FOUND",
      404
    );
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends TodoError {
  constructor(message: string, originalError?: unknown) {
    super(message, "DATABASE_ERROR", 500);
    this.name = "DatabaseError";
    if (originalError instanceof Error) {
      this.stack = originalError.stack;
    }
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof TodoError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Log the full error for debugging
    console.error("Unexpected error:", error);
    return "An unexpected error occurred";
  }
  
  console.error("Unknown error:", error);
  return "An unknown error occurred";
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("UNIQUE constraint failed") ||
           error.message.includes("unique") ||
           error.message.includes("already exists");
  }
  return false;
}