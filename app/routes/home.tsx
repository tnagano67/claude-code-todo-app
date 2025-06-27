import * as schema from "~/database/schema";
import { getErrorMessage, isUniqueConstraintError } from "~/lib/errors";

import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  let name = formData.get("name");
  let email = formData.get("email");
  
  if (typeof name !== "string" || typeof email !== "string") {
    return { guestBookError: "Name and email are required" };
  }

  name = name.trim();
  email = email.trim();
  
  if (!name || !email) {
    return { guestBookError: "Name and email are required" };
  }
  
  if (name.length > 100) {
    return { guestBookError: "Name must be 100 characters or less" };
  }
  
  if (email.length > 255) {
    return { guestBookError: "Email must be 255 characters or less" };
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { guestBookError: "Please enter a valid email address" };
  }

  try {
    await context.db.insert(schema.guestBook).values({ name, email });
    return { success: "Added to guest book successfully!" };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { guestBookError: "This email is already in the guest book" };
    }
    console.error("Guest book error:", error);
    return { guestBookError: getErrorMessage(error) };
  }
}

export async function loader({ context }: Route.LoaderArgs) {
  try {
    const guestBook = await context.db.query.guestBook.findMany({
      columns: {
        id: true,
        name: true,
      },
    });

    return {
      guestBook,
      message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
    };
  } catch (error) {
    console.error("Failed to load guest book:", error);
    return {
      guestBook: [],
      message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
      error: "Failed to load guest book"
    };
  }
}

export default function Home({ actionData, loaderData }: Route.ComponentProps) {
  return (
    <Welcome
      guestBook={loaderData.guestBook}
      guestBookError={actionData?.guestBookError}
      message={loaderData.message}
    />
  );
}
