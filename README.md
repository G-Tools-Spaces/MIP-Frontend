# MeiCrypt Identity — Frontend

Next.js 14 frontend for the **MeiCrypt Identity Platform (MIP)**. Ships four
distinct portals inside a single App Router codebase using route groups.

## 🧱 Stack

- **Framework:** Next.js 16 (App Router, RSC)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + custom shadcn-style UI primitives
- **Server state:** TanStack Query 5
- **Client state:** Zustand
- **Forms:** React Hook Form + Zod
- **HTTP:** Axios (with silent token refresh + RFC 7807 error translation)
- **Auth:** OAuth2 Authorization Code + PKCE (RFC 7636)
- **Icons:** Lucide
- **Toasts:** Sonner
- **Theming:** next-themes (light / dark / system)

## 📁 Layout

```
src/
├── app/
│   ├── (auth)/                  # Public — login, register, MFA, verify-email
│   │   ├── layout.tsx           # Split-screen brand + form layout
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── mfa-challenge/
│   │   └── verify-email/
│   ├── (console)/               # Org admin console (placeholder, expands in F2)
│   │   └── console/
│   ├── layout.tsx               # Root layout — providers, fonts, theme
│   ├── page.tsx                 # Root → redirects to /login
│   └── globals.css              # Tailwind + design tokens
├── components/
│   ├── brand/                   # Logo, wordmark
│   ├── providers/               # QueryProvider, ThemeProvider, AppProviders
│   └── ui/                      # Button, Input, Label, Field, Alert, Card
├── lib/
│   ├── api/
│   │   ├── client.ts            # Axios instance + interceptors
│   │   ├── problem.ts           # RFC 7807 ProblemDetails + ApiError
│   │   └── endpoints/auth.ts    # /api/v1/auth/* client
│   ├── auth/
│   │   ├── token-store.ts       # In-memory + sessionStorage token store
│   │   └── pkce.ts              # PKCE code verifier/challenge helpers
│   └── utils.ts                 # cn() Tailwind helper
├── stores/
│   └── session-store.ts         # Zustand — user, org, MFA state
├── env.ts                       # Runtime env accessor
└── middleware.ts                # Request-ID header (future tenant resolution)
```

## 🚀 Quick start

```bash
# From /home/siva-25197/Downloads/meicrypt
cp frontend/.env.local.example frontend/.env.local
cd frontend
pnpm install
pnpm dev
```

Open <http://localhost:3000> — you'll land on `/login`.

Make sure the Spring backend is running at `NEXT_PUBLIC_API_BASE_URL`
(default `http://localhost:8080`):

```bash
# From project root, in another terminal
docker-compose up -d postgres redis
mvn spring-boot:run
```

## 🔐 Auth flow

1. `LoginForm` posts to `POST /api/v1/auth/login` (JSON: `{ orgSlug, email, password }`).
2. Backend returns `{ accessToken, expiresIn, user, orgSlug }` and sets an
   **HttpOnly refresh cookie**.
3. `useSession.setSession` hydrates `tokenStore` + Zustand and routes to `/console`.
4. Any authenticated request that returns **401** triggers a single silent
   `POST /api/v1/auth/refresh`; on failure the store is cleared and the user
   is bounced back to `/login`.
5. If the backend responds with `mfaRequired: true`, the UI routes to
   `/mfa-challenge` and posts the TOTP code to
   `POST /api/v1/auth/mfa/verify`.

## 🎨 Design system

The UI adopts a clean **slate + indigo** palette inspired by Auth0/Clerk. All
primitives live under `src/components/ui/` and are:

- fully typed with `class-variance-authority`
- keyboard-accessible
- dark-mode aware via the `.dark` class on `<html>`

Swap the palette in `globals.css` (`--ring`, gradient stops) and Tailwind
utility classes — no lock-in to a third-party UI kit.

## 🧭 Roadmap

- **F0 ✅** Bootstrap + API client + design system + auth providers
- **F1 ✅** Login, register, forgot-password, verify-email, MFA challenge
- **F2** Console shell — sidebar, org switcher, tenant theming
- **F3** Organization management (settings, memberships, invitations, domains)
- **F4** User management (list, detail, lifecycle)
- **F5** RBAC UI (roles, permissions, assignments)
- **F6** Developer Portal (OAuth client apps, secret rotation, redirect URIs)
- **F7** OAuth consent screens + OIDC discovery integration
- **F8** MFA & Passkey enrollment (TOTP QR, WebAuthn)
- **F9** SSO portal + Single Logout
- **F10** Audit log viewer + notification template editor
- **F11** Platform Admin console (global orgs, stats)
- **F12** Polish — i18n, a11y, E2E tests (Playwright)

## 🧪 Scripts

```bash
pnpm dev      # Next dev server (http://localhost:3000)
pnpm build    # Production build
pnpm start    # Serve production build
pnpm lint     # ESLint (next/core-web-vitals)
```
