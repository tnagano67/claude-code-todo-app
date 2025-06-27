import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { createRequestHandler } from "react-router";
import * as schema from "../database/schema";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
    db: DrizzleD1Database<typeof schema>;
  }
}

export default {
  async fetch(request, env, ctx) {
    const db = drizzle(env.DB, { schema });

    const requestHandler = createRequestHandler(
      await import("virtual:react-router/server-build"),
      import.meta.env.MODE
    );

    return requestHandler(request, {
      cloudflare: { env, ctx },
      db,
    });
  },
} satisfies ExportedHandler<Env>;
