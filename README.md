# MeiCrypt Identity Provider — Frontend

Next.js frontend for the **MeiCrypt Identity Platform (MIP)**. Ships four distinct portals inside a single App Router codebase using route groups.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Setup & Running](#setup--running)
- [Things That Are Not Visible on Screen](#things-that-are-not-visible-on-screen)
- [Portal Routes](#portal-routes)

---

## Tech Stack

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| Framework      | Next.js 16 (App Router, RSC)                    |
| Language       | TypeScript (strict mode)                        |
| Styling        | Tailwind CSS v4 + custom shadcn-style UI        |
| Server State   | TanStack Query 5                                |
| Client State   | Zustand                                         |
| Forms          | React Hook Form + Zod                           |
| HTTP Client    | Axios (silent token refresh + RFC 7807 errors)  |
| Auth           | OAuth2 Authorization Code + PKCE (RFC 7636)     |
| Icons          | Lucide                                          |
| Toasts         | Sonner                                          |
| Theming        | next-themes (light / dark / system)             |
| Package Manager| pnpm                                            |

---

## Prerequisites

Make sure the following are installed before you start:

- **Node.js 20+** — `node -v`
- **pnpm** — `npm install -g pnpm` (or `corepack enable && corepack prepare pnpm@latest --activate`)
- The **backend** (`MeiCrypt-Identity-Provider`) must be running on `http://localhost:8080` before you start the frontend.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Public — login, register, MFA, verify-email, onboarding
│   ├── (console)/       # Org admin console
│   ├── (platform)/      # Global admin platform management
│   ├── (oauth)/         # OAuth2 authorize & OIDC discovery
│   ├── (account)/       # Logged-in user profile & security settings
│   └── layout.tsx       # Root layout — providers, fonts, theme
├── components/
│   ├── ui/              # Reusable UI primitives (Button, Card, Input, etc.)
│   ├── console/         # Console-specific components (sidebar, topbar, etc.)
│   └── providers/       # React context providers
├── lib/
│   ├── api/             # Axios client + typed endpoint functions
│   └── auth/            # PKCE helpers, token store, auth hooks
└── stores/              # Zustand global stores
```

---

## Environment Variables

Create a `.env.local` file in the `MeiCrypt-Identity-Provider---Frontend/` directory. A working `.env.local` file is already present — update values as needed.

> ⚠️ Never commit `.env.local` to version control. It is already in `.gitignore`.

### All Environment Variables

#### Backend API (Required)

| Variable                  | Description                                                         | Default / Example               | Where to Get It                              |
|---------------------------|---------------------------------------------------------------------|---------------------------------|----------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`| Base URL of the Spring Boot backend API                             | `http://localhost:8080`         | Your running backend URL                     |
| `NEXT_PUBLIC_ISSUER_URL`  | OAuth2/OIDC issuer URL — must match `MEICRYPT_ISSUER` in backend   | `http://localhost:8080`         | Same as backend `MEICRYPT_ISSUER`            |

#### Supabase (Required if using Supabase backend)

| Variable                        | Description                                                         | Where to Get It                                                            |
|---------------------------------|---------------------------------------------------------------------|----------------------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                                           | Supabase Dashboard → Project Settings → API → Project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public/anon key — safe to expose in browser               | Supabase Dashboard → Project Settings → API → `anon` `public` key         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key — **server-side only, never expose to browser** | Supabase Dashboard → Project Settings → API → `service_role` key    |
| `SUPABASE_DB_URL`               | Direct PostgreSQL connection string (for migrations)               | Supabase Dashboard → Project Settings → Database → Connection String        |

#### Application

| Variable              | Description                                      | Default               |
|-----------------------|--------------------------------------------------|-----------------------|
| `NEXT_PUBLIC_APP_NAME`| Application display name shown in the UI        | `MeiCrypt Identity`   |
| `NODE_ENV`            | Node environment (`development` / `production`)  | `development`         |

#### Optional

| Variable     | Description                                            | Example                                              |
|--------------|--------------------------------------------------------|------------------------------------------------------|
| `REDIS_URL`  | Redis connection URL (if using with Supabase/external) | `redis://default:password@your-redis-host:6379`      |

---

### Minimal `.env.local` for local development

If you're running the backend locally with **Option A** (local Docker), you only need these:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_ISSUER_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=MeiCrypt Identity
NODE_ENV=development

# Supabase — fill in from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_DB_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
```

---

## Setup & Running

### 1. Install dependencies

```bash
cd MeiCrypt-Identity-Provider---Frontend
pnpm install
```

### 2. Set up environment variables

```bash
# The .env.local file already exists — review and update values as needed
# At minimum, ensure NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_ISSUER_URL are correct
```

### 3. Make sure the backend is running

The frontend depends on the backend API being available. Start the backend first:

```bash
# In MeiCrypt-Identity-Provider/
docker-compose up -d       # Start PostgreSQL + Redis
./mvnw spring-boot:run     # Start Spring Boot on port 8080
```

### 4. Start the frontend

```bash
pnpm dev
```

The app will be available at **http://localhost:3000**.

### Build for production

```bash
pnpm build
pnpm start
```

### Lint

```bash
pnpm lint
```

---

## Things That Are Not Visible on Screen

These are behaviours that are not shown in the UI but are important to know during development.

### OTP (One-Time Password) During Registration

When you register a new account and reach the email verification step, **the OTP code is NOT shown in the browser**. The input box will appear blank and waiting.

You must look at the **backend terminal logs** to find the OTP code. Look for a line like:

```
[OTP] Plaintext OTP for user@example.com: 847392
```

Copy this code and paste it into the OTP input field in the browser to complete registration.

> This log only appears when `meicrypt.onboarding.otp.log-plaintext=true` is set in the backend (enabled by default in the `local` and `supabase` dev profiles).

### Token Refresh (Silent)

The Axios HTTP client silently refreshes access tokens in the background using the refresh token. There is **no loading indicator or visible feedback** during this. If you see a brief pause in API calls, the token is likely being refreshed. Check browser DevTools → Network tab to inspect token refresh requests to `/api/v1/auth/refresh`.

### PKCE Auth Flow

The login flow uses **OAuth2 Authorization Code + PKCE**. The `code_verifier` and `code_challenge` are generated client-side and stored in `sessionStorage` temporarily during the OAuth redirect. You won't see this in the UI — check browser DevTools → Application → Session Storage if you need to inspect it.

### Org Switcher Persistence

The currently selected organisation is persisted in the Zustand session store (in-memory). If you refresh the page, the active org may reset. This is expected behaviour in the current version.

### Console Sections Marked "Coming Soon"

Several console sections (e.g., some settings sub-pages) render a "Coming Soon" placeholder. There is no error — these are intentional stubs for future features. The sidebar may link to them but clicking shows only a placeholder screen.

---

## Portal Routes

| Route                     | Portal                | Description                                         |
|---------------------------|-----------------------|-----------------------------------------------------|
| `/login`                  | Auth                  | Sign in page                                        |
| `/register`               | Auth                  | Create new account                                  |
| `/verify-email`           | Auth                  | Email OTP verification (enter OTP from backend logs)|
| `/forgot-password`        | Auth                  | Password reset flow                                 |
| `/mfa-challenge`          | Auth                  | TOTP / WebAuthn MFA challenge                       |
| `/onboarding/choose`      | Auth                  | Post-registration: create or join an org            |
| `/onboarding/setup`       | Auth                  | New org setup wizard                                |
| `/onboarding/join`        | Auth                  | Join org via invitation                             |
| `/console`                | Org Admin Console     | Org admin dashboard                                 |
| `/console/users`          | Org Admin Console     | Manage org users                                    |
| `/console/roles`          | Org Admin Console     | Manage roles & permissions                          |
| `/console/applications`   | Org Admin Console     | Manage OAuth2 client applications                   |
| `/console/invitations`    | Org Admin Console     | Send & manage user invitations                      |
| `/console/audit`          | Org Admin Console     | Audit log viewer                                    |
| `/console/domains`        | Org Admin Console     | Domain configuration                                |
| `/console/oauth-clients`  | Org Admin Console     | OAuth2 clients registry                             |
| `/admin`                  | Global Platform Admin | Platform-wide admin dashboard                       |
| `/admin/org-creation-requests` | Global Platform Admin | Approve/reject org creation requests          |
| `/profile`                | Account               | User profile management                             |
| `/authorize`              | OAuth                 | OAuth2 authorization consent screen                 |
