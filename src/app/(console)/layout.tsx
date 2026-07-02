import type { ReactNode } from "react";
import { ConsoleSidebar } from "@/components/console/sidebar";
import { ConsoleTopbar } from "@/components/console/topbar";
import { ConsoleAuthGuard } from "@/components/console/auth-guard";

/**
 * Shell layout for the organization admin console.
 *
 * - Fixed sidebar with grouped navigation on desktop.
 * - Sticky topbar with organization switcher, search, and user menu.
 * - Client-side auth guard bounces unauthenticated users to /login.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <ConsoleSidebar />
      <div className="flex flex-1 min-w-0 flex-col">
        <ConsoleTopbar />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <ConsoleAuthGuard>{children}</ConsoleAuthGuard>
        </main>
      </div>
    </div>
  );
}
