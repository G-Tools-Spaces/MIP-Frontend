import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { env } from "@/env";

/**
 * Split-screen layout used by all pages under the (auth) route group:
 * login, register, forgot-password, verify-email, mfa-challenge, etc.
 *
 * Left pane: brand marketing panel.
 * Right pane: focused form card.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 text-slate-100 p-10">
        <div className="auth-hero-bg absolute inset-0 opacity-80" />
        <div className="relative">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Identity infrastructure
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
              built for the enterprise.
            </span>
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Multi-tenant OAuth2 &amp; OIDC, fine-grained RBAC, MFA, passkeys, and
            SSO — all governed by an immutable audit trail.
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              RFC-compliant OAuth2 &amp; OpenID Connect
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Organization-scoped multi-tenancy
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              WebAuthn passkeys &amp; TOTP MFA
            </li>
          </ul>
        </div>

        <div className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} {env.appName}. All rights reserved.
        </div>
      </aside>

      {/* Right — form pane */}
      <main className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
        <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <Logo />
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
