import { redirect } from "next/navigation";

/**
 * Root route — for the initial phase we send visitors straight to /login.
 * A public marketing landing can replace this once F2 (console shell) is done.
 */
export default function RootPage() {
  redirect("/login");
}
