import type { ReactNode } from "react";
import { ConsoleSidebar } from "@/components/console/sidebar";
import { ConsoleTopbar } from "@/components/console/topbar";
import { ConsoleAuthGuard } from "@/components/console/auth-guard";

/**
 * Account self-service pages (Profile, Security, Devices). Shares the console
 * chrome so users can hop between account and org admin without a reload.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
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
