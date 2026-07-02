"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LogOut,
  Moon,
  Sun,
  User as UserIcon,
  Monitor,
  KeyRound,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { useSession } from "@/stores/session-store";
import { authApi } from "@/lib/api/endpoints/auth";

export const UserMenu = () => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = useSession((s) => s.user);
  const clear = useSession((s) => s.clear);

  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clear();
      toast.success("Signed out");
      router.push("/login");
    },
  });

  return (
    <Dropdown
      trigger={
        <span className="flex items-center gap-2 rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Avatar
            name={user?.displayName ?? user?.email ?? "?"}
            src={undefined}
          />
        </span>
      }
    >
      {(close) => (
        <>
          <DropdownLabel>{user?.email ?? "Signed in"}</DropdownLabel>
          <DropdownItem
            onClick={() => {
              close();
              router.push("/profile");
            }}
          >
            <UserIcon className="h-4 w-4 text-slate-400" />
            Your profile
          </DropdownItem>
          <DropdownItem
            onClick={() => {
              close();
              router.push("/profile/security");
            }}
          >
            <KeyRound className="h-4 w-4 text-slate-400" />
            Security &amp; MFA
          </DropdownItem>

          <DropdownSeparator />
          <DropdownLabel>Theme</DropdownLabel>
          <DropdownItem onClick={() => setTheme("light")}>
            <Sun className="h-4 w-4 text-slate-400" />
            Light {theme === "light" && "•"}
          </DropdownItem>
          <DropdownItem onClick={() => setTheme("dark")}>
            <Moon className="h-4 w-4 text-slate-400" />
            Dark {theme === "dark" && "•"}
          </DropdownItem>
          <DropdownItem onClick={() => setTheme("system")}>
            <Monitor className="h-4 w-4 text-slate-400" />
            System {theme === "system" && "•"}
          </DropdownItem>

          <DropdownSeparator />
          <DropdownItem
            destructive
            onClick={() => {
              close();
              logout.mutate();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
};
