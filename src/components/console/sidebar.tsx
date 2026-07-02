"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { consoleNav } from "./nav-config";
import { cn } from "@/lib/utils";

const isActive = (pathname: string, href: string) =>
  href === "/console" ? pathname === "/console" : pathname.startsWith(href);

export const ConsoleSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-16 items-center px-5 border-b border-slate-200 dark:border-slate-800">
        <Link href="/console" className="flex items-center">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {consoleNav.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname ?? "", item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            active
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300",
                          )}
                          strokeWidth={2}
                        />
                        {item.label}
                      </span>
                      {item.soon && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Soon
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-400 dark:border-slate-800">
        v0.1 · MIP Frontend
      </div>
    </aside>
  );
};
