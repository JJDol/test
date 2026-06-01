import { redirect } from "next/navigation";

/**
 * Home Page
 *
 * middleware.ts already redirects "/" → "/sign-in" for unauthenticated users
 * and "/sign-in" → "/protected/dashboard" for authenticated users.
 * This page only serves as a fallback redirect.
 */
export default function Home() {
  redirect("/sign-in");
}
