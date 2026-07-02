"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

export const ConsoleTopbar = () => (
  <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-8 dark:border-slate-800 dark:bg-slate-950/70">
    <div className="flex items-center gap-3">
      <OrgSwitcher />
    </div>

    <div className="hidden md:block flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="Search users, roles, applications…"
          className="pl-9"
          aria-label="Search"
        />
      </div>
    </div>

    <div className="flex items-center gap-3">
      <UserMenu />
    </div>
  </header>
);
