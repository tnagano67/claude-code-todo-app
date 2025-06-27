import { Form } from "react-router";
import { getAllTodos, createTodo, updateTodo, deleteTodo, getTodoStats, type TodoFilter } from "~/lib/todos";
import { getErrorMessage, ValidationError, NotFoundError } from "~/lib/errors";
import type { Route } from "./+types/todos";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Todo App" },
    { name: "description", content: "Manage your todos with style" },
  ];
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  try {
    switch (intent) {
      case "create": {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const priority = formData.get("priority") as "low" | "medium" | "high";
        
        await createTodo(context.db, {
          title,
          description: description || undefined,
          priority: priority || "medium"
        });
        
        return { success: "Todo created successfully" };
      }
      
      case "toggle": {
        const idStr = formData.get("id") as string;
        const id = parseInt(idStr);
        
        if (isNaN(id)) {
          return { error: "Invalid todo ID" };
        }
        
        const completed = formData.get("completed") === "true";
        
        const result = await updateTodo(context.db, id, { completed: !completed });
        if (!result) {
          return { error: "Todo not found" };
        }
        
        return { success: "Todo updated successfully" };
      }
      
      case "delete": {
        const idStr = formData.get("id") as string;
        const id = parseInt(idStr);
        
        if (isNaN(id)) {
          return { error: "Invalid todo ID" };
        }
        
        const deleted = await deleteTodo(context.db, id);
        if (!deleted) {
          return { error: "Todo not found or could not be deleted" };
        }
        
        return { success: "Todo deleted successfully" };
      }
      
      case "update": {
        const idStr = formData.get("id") as string;
        const id = parseInt(idStr);
        
        if (isNaN(id)) {
          return { error: "Invalid todo ID" };
        }
        
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const priority = formData.get("priority") as "low" | "medium" | "high";
        
        const result = await updateTodo(context.db, id, {
          title,
          description: description || undefined,
          priority: priority || "medium"
        });
        
        if (!result) {
          return { error: "Todo not found" };
        }
        
        return { success: "Todo updated successfully" };
      }
      
      default:
        return { error: "Invalid action" };
    }
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function loader({ context, request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters for filtering
    const filter: TodoFilter = {};
    const completedParam = url.searchParams.get("completed");
    if (completedParam !== null) {
      filter.completed = completedParam === "true";
    }
    
    const priority = url.searchParams.get("priority") as "low" | "medium" | "high" | null;
    if (priority && ["low", "medium", "high"].includes(priority)) {
      filter.priority = priority;
    }
    
    const search = url.searchParams.get("search");
    if (search) {
      filter.search = search;
    }
    
    // Parse sorting
    const sortField = url.searchParams.get("sort") as "createdAt" | "updatedAt" | "title" | "priority" || "createdAt";
    const sortOrder = url.searchParams.get("order") as "asc" | "desc" || "desc";
    
    // Parse pagination
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100); // Max 100 items
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    const [todos, stats] = await Promise.all([
      getAllTodos(
        context.db,
        Object.keys(filter).length > 0 ? filter : undefined,
        { field: sortField, order: sortOrder },
        { limit, offset }
      ),
      getTodoStats(context.db)
    ]);
    
    return { 
      todos, 
      stats,
      filter,
      sort: { field: sortField, order: sortOrder },
      pagination: { limit, offset }
    };
  } catch (error) {
    console.error("Failed to load todos:", error);
    return { 
      todos: [], 
      stats: { total: 0, completed: 0, pending: 0, byPriority: { low: 0, medium: 0, high: 0 } },
      error: "Failed to load todos" 
    };
  }
}

export default function Todos({ loaderData, actionData }: Route.ComponentProps) {
  const { todos, stats } = loaderData;
  const completedCount = stats?.completed ?? todos.filter(todo => todo.completed).length;
  const totalCount = stats?.total ?? todos.length;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Todo App
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Stay organized and productive
          </p>
          <div className="mt-4 flex justify-center space-x-4 text-sm">
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
              {totalCount} total
            </span>
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full">
              {completedCount} completed
            </span>
            <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full">
              {totalCount - completedCount} pending
            </span>
          </div>
        </div>

        {(actionData?.error || loaderData.error) && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg">
            {actionData?.error || loaderData.error}
          </div>
        )}

        {actionData?.success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 rounded-lg">
            {actionData.success}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Add New Todo
          </h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create" />
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter todo title..."
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter description (optional)..."
              />
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                name="priority"
                id="priority"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Add Todo
            </button>
          </Form>
        </div>

        <div className="space-y-4">
          {todos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                No todos yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create your first todo to get started
              </p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 ${
                  todo.priority === "high"
                    ? "border-red-500"
                    : todo.priority === "medium"
                    ? "border-yellow-500"
                    : "border-green-500"
                } ${todo.completed ? "opacity-75" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Form method="post" className="mr-3">
                        <input type="hidden" name="intent" value="toggle" />
                        <input type="hidden" name="id" value={todo.id} />
                        <input type="hidden" name="completed" value={todo.completed.toString()} />
                        <button
                          type="submit"
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                            todo.completed
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-300 dark:border-gray-600 hover:border-green-500"
                          }`}
                        >
                          {todo.completed && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </Form>
                      
                      <h3 className={`text-lg font-medium ${
                        todo.completed
                          ? "text-gray-500 dark:text-gray-400 line-through"
                          : "text-gray-900 dark:text-white"
                      }`}>
                        {todo.title}
                      </h3>
                      
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                        todo.priority === "high"
                          ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                          : todo.priority === "medium"
                          ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      }`}>
                        {todo.priority}
                      </span>
                    </div>
                    
                    {todo.description && (
                      <p className={`text-sm mb-3 ${
                        todo.completed
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-600 dark:text-gray-300"
                      }`}>
                        {todo.description}
                      </p>
                    )}
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Created: {new Date(todo.createdAt).toLocaleDateString()}
                      {todo.updatedAt !== todo.createdAt && (
                        <span className="ml-2">
                          Updated: {new Date(todo.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Form method="post" className="ml-4">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={todo.id} />
                    <button
                      type="submit"
                      className="text-red-500 hover:text-red-700 transition-colors duration-200"
                      title="Delete todo"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </Form>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}