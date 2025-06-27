import { eq, desc, and, or, count, asc, sql, like } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { todos } from "~/database/schema";
import type * as schema from "~/database/schema";
import { DatabaseError, NotFoundError, ValidationError } from "~/lib/errors";

type Database = DrizzleD1Database<typeof schema>;

export type TodoFilter = {
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  search?: string;
};

export type TodoSort = {
  field: "createdAt" | "updatedAt" | "title" | "priority";
  order: "asc" | "desc";
};

export type TodoPagination = {
  limit: number;
  offset: number;
};

export type Todo = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTodoData = {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
};

export type UpdateTodoData = {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
};

export async function getAllTodos(
  db: Database, 
  filter?: TodoFilter,
  sort: TodoSort = { field: "createdAt", order: "desc" },
  pagination?: TodoPagination
): Promise<Todo[]> {
  try {
    let query = db.select().from(todos);
    
    // Apply filters
    const conditions = [];
    if (filter?.completed !== undefined) {
      conditions.push(eq(todos.completed, filter.completed));
    }
    if (filter?.priority) {
      conditions.push(eq(todos.priority, filter.priority));
    }
    if (filter?.search) {
      const searchTerm = `%${filter.search.toLowerCase()}%`;
      conditions.push(
        or(
          like(todos.title, searchTerm),
          like(todos.description, searchTerm)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Apply sorting
    const sortField = todos[sort.field];
    query = query.orderBy(sort.order === "asc" ? asc(sortField) : desc(sortField)) as any;
    
    // Apply pagination
    if (pagination) {
      query = query.limit(pagination.limit).offset(pagination.offset) as any;
    }
    
    return await query;
  } catch (error) {
    throw new DatabaseError("Failed to fetch todos", error);
  }
}

export async function getTodoById(db: Database, id: number): Promise<Todo | null> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid todo ID", "id");
  }
  
  try {
    const result = await db.select().from(todos).where(eq(todos.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    throw new DatabaseError(`Failed to fetch todo with id ${id}`, error);
  }
}

export async function createTodo(db: Database, data: CreateTodoData): Promise<Todo> {
  // Validation
  if (!data.title || data.title.trim().length === 0) {
    throw new ValidationError("Title is required", "title");
  }
  
  if (data.title.trim().length > 255) {
    throw new ValidationError("Title must be 255 characters or less", "title");
  }
  
  if (data.description && data.description.length > 1000) {
    throw new ValidationError("Description must be 1000 characters or less", "description");
  }
  
  if (data.priority && !["low", "medium", "high"].includes(data.priority)) {
    throw new ValidationError("Priority must be low, medium, or high", "priority");
  }
  
  try {
    const now = new Date();
    const result = await db.insert(todos).values({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      priority: data.priority || "medium",
      completed: false,
      createdAt: now,
      updatedAt: now,
    }).returning();
    
    if (!result[0]) {
      throw new DatabaseError("Failed to create todo: No result returned");
    }
    
    return result[0];
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to create todo", error);
  }
}

export async function updateTodo(db: Database, id: number, data: UpdateTodoData): Promise<Todo | null> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid todo ID", "id");
  }
  
  // Validation
  if (data.title !== undefined) {
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError("Title cannot be empty", "title");
    }
    if (data.title.trim().length > 255) {
      throw new ValidationError("Title must be 255 characters or less", "title");
    }
  }
  
  if (data.description !== undefined && data.description && data.description.length > 1000) {
    throw new ValidationError("Description must be 1000 characters or less", "description");
  }
  
  if (data.priority && !["low", "medium", "high"].includes(data.priority)) {
    throw new ValidationError("Priority must be low, medium, or high", "priority");
  }
  
  try {
    const now = new Date();
    const updateData: Partial<UpdateTodoData> & { updatedAt: Date } = {
      ...data,
      updatedAt: now,
    };
    
    // Trim string fields
    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || undefined;
    }
    
    if (data.description === undefined) {
      delete updateData.description;
    }
    
    const result = await db.update(todos)
      .set(updateData)
      .where(eq(todos.id, id))
      .returning();
      
    return result[0] || null;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update todo with id ${id}`, error);
  }
}

export async function deleteTodo(db: Database, id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid todo ID", "id");
  }
  
  try {
    const result = await db.delete(todos).where(eq(todos.id, id));
    // In-memory SQLite (better-sqlite3) returns different result format than D1
    return (result as any).changes > 0 || (result.meta?.changes ?? 0) > 0;
  } catch (error) {
    throw new DatabaseError(`Failed to delete todo with id ${id}`, error);
  }
}

export async function toggleTodoComplete(db: Database, id: number): Promise<Todo | null> {
  try {
    const todo = await getTodoById(db, id);
    if (!todo) {
      return null;
    }
    
    return await updateTodo(db, id, { completed: !todo.completed });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError(`Failed to toggle todo completion for id ${id}`, error);
  }
}

export async function getTodoStats(db: Database): Promise<{
  total: number;
  completed: number;
  pending: number;
  byPriority: { low: number; medium: number; high: number };
}> {
  try {
    const [totalResult, completedResult, pendingResult, lowResult, mediumResult, highResult] = await Promise.all([
      db.select({ count: count() }).from(todos),
      db.select({ count: count() }).from(todos).where(eq(todos.completed, true)),
      db.select({ count: count() }).from(todos).where(eq(todos.completed, false)),
      db.select({ count: count() }).from(todos).where(eq(todos.priority, "low")),
      db.select({ count: count() }).from(todos).where(eq(todos.priority, "medium")),
      db.select({ count: count() }).from(todos).where(eq(todos.priority, "high")),
    ]);
    
    return {
      total: totalResult[0]?.count ?? 0,
      completed: completedResult[0]?.count ?? 0,
      pending: pendingResult[0]?.count ?? 0,
      byPriority: {
        low: lowResult[0]?.count ?? 0,
        medium: mediumResult[0]?.count ?? 0,
        high: highResult[0]?.count ?? 0,
      },
    };
  } catch (error) {
    throw new DatabaseError("Failed to fetch todo statistics", error);
  }
}

export async function getTodosByStatus(db: Database, completed: boolean): Promise<Todo[]> {
  try {
    return await db
      .select()
      .from(todos)
      .where(eq(todos.completed, completed))
      .orderBy(desc(todos.createdAt));
  } catch (error) {
    throw new DatabaseError(`Failed to fetch ${completed ? 'completed' : 'pending'} todos`, error);
  }
}

export async function getTodosByPriority(db: Database, priority: "low" | "medium" | "high"): Promise<Todo[]> {
  try {
    return await db
      .select()
      .from(todos)
      .where(eq(todos.priority, priority))
      .orderBy(desc(todos.createdAt));
  } catch (error) {
    throw new DatabaseError(`Failed to fetch ${priority} priority todos`, error);
  }
}

export async function searchTodos(db: Database, searchTerm: string): Promise<Todo[]> {
  if (!searchTerm.trim()) {
    return [];
  }
  
  try {
    const term = `%${searchTerm.toLowerCase()}%`;
    return await db
      .select()
      .from(todos)
      .where(
        or(
          like(todos.title, term),
          like(todos.description, term)
        )
      )
      .orderBy(desc(todos.createdAt));
  } catch (error) {
    throw new DatabaseError("Failed to search todos", error);
  }
}

export async function bulkUpdateTodos(db: Database, ids: number[], updates: UpdateTodoData): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }
  
  // Validate all IDs
  for (const id of ids) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(`Invalid todo ID: ${id}`, "id");
    }
  }
  
  try {
    const now = new Date();
    const updateData = { ...updates, updatedAt: now };
    
    let count = 0;
    // Process in batches to avoid SQL length limits
    const batchSize = 50;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      for (const id of batch) {
        const result = await db
          .update(todos)
          .set(updateData)
          .where(eq(todos.id, id));
        
        // Count successful updates
        if ((result as any).changes > 0 || (result.meta?.changes ?? 0) > 0) {
          count++;
        }
      }
    }
    
    return count;
  } catch (error) {
    throw new DatabaseError("Failed to bulk update todos", error);
  }
}