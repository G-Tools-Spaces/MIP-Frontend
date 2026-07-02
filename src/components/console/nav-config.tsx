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
    items: [
      { label: "Global admin", href: "/admin", icon: Server },
    ],
  },
];
