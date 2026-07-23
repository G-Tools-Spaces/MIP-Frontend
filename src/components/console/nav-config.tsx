import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  KeyRound,
  Building2,
  Mail,
  Globe,
  ScrollText,
  Boxes,
  UserCircle,
  Server,
  Radio,
  Inbox,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  /**
   * When true, this group should only be rendered to users with the
   * {@code ROLE_PLATFORM_ADMIN} authority (Global Admin). The sidebar
   * component is responsible for enforcing this — see
   * {@link @/lib/auth/use-is-global-admin useIsGlobalAdmin}.
   */
  platformAdminOnly?: boolean;
};

export const consoleNav: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/console", icon: LayoutDashboard },
    ],
  },
  {
    label: "Directory",
    items: [
      { label: "Users", href: "/console/users", icon: Users },
      { label: "Roles & Permissions", href: "/console/roles", icon: ShieldCheck },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Settings", href: "/console/settings", icon: Building2 },
      { label: "Invitations", href: "/console/invitations", icon: Mail },
      { label: "Join Requests", href: "/console/join-requests", icon: UserPlus },
      { label: "Custom Domains", href: "/console/domains", icon: Globe },
    ],
  },
  {
    label: "Developer",
    items: [
      { label: "Applications", href: "/console/applications", icon: Boxes },
      { label: "OIDC Discovery", href: "/discovery", icon: Radio },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Audit Log", href: "/console/audit", icon: ScrollText },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Your profile", href: "/profile", icon: UserCircle },
      { label: "Security & MFA", href: "/profile/security", icon: KeyRound },
    ],
  },
  {
    label: "Platform admin",
    platformAdminOnly: true,
    items: [
      { label: "Global admin", href: "/admin", icon: Server },
      {
        // Global-admin approval queue for "Create business" (org creation)
        // submissions. Rejecting is done inline on the same page. This is
        // the ONLY UI entry-point for approving new tenants.
        label: "Org creation queue",
        href: "/admin/org-creation-requests",
        icon: Inbox,
      },
    ],
  },
];
