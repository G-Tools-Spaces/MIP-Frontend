"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session-store";

/**
 * Organization switcher — for now displays the active org bound to the
 * session. Multi-org membership switching will land alongside Phase F3.
 */
export const OrgSwitcher = () => {
  const orgSlug = useSession((s) => s.orgSlug);
  const displayOrg = orgSlug ?? "your-org";
  const router = useRouter();

  return (
    <Dropdown
      trigger={
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Avatar name={displayOrg} size="sm" />
          <div className="text-left leading-tight">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              Organization
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {displayOrg}
            </div>
          </div>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
        </div>
      }
      align="start"
      className="min-w-[16rem]"
    >
      {(close) => (
        <>
          <DropdownLabel>Signed in as</DropdownLabel>
          <DropdownItem
            onClick={close}
            className={cn(
              "flex items-center justify-between font-medium",
              "text-slate-900 dark:text-slate-100",
            )}
          >
            <span className="flex items-center gap-2">
              <Avatar name={displayOrg} size="sm" />
              {displayOrg}
            </span>
            <Check className="h-4 w-4 text-indigo-600" />
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            onClick={() => {
              close();
              router.push("/onboarding/setup");
            }}
          >
            <Plus className="h-4 w-4 text-slate-400" />
            Create organization
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
};
