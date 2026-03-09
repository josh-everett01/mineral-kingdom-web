# Mineral Kingdom Web

Frontend application for the Mineral Kingdom marketplace and auction platform.

This repo contains the user-facing web app built with **Next.js App Router**, with a **BFF layer** for frontend-safe API access to the Mineral Kingdom backend.

## Current Focus

This frontend currently includes foundational work for:

- authentication UX
- registration and login flows
- email verification flow
- resend verification flow
- authenticated account/session display
- BFF proxy routes
- Playwright end-to-end coverage for auth and BFF behavior

## Tech Stack

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Playwright**
- **OpenAPI-generated API types**

## Project Structure

```text
src/
  app/
    api/bff/                # Frontend BFF route handlers
    login/                  # Login UI
    register/               # Registration UI
    verify-email/           # Email verification UI
    resend-verification/    # Resend verification UI
    account/                # Authenticated session/account page
  components/
    auth/                   # Auth hooks/components
    site/                   # Shared site layout components
    ui/                     # Shared UI primitives
  lib/
    api/                    # API helpers + generated OpenAPI types
    auth/                   # Auth contracts/types
e2e/                        # Playwright end-to-end tests
scripts/                    # Local generation / utility scripts
```

## BFF Routes

This repo uses a Backend-for-Frontend pattern so the browser talks to frontend-owned routes instead of calling the backend API directly.

Current auth-related BFF routes include:

- `POST /api/bff/auth/register`
- `POST /api/bff/auth/login`
- `POST /api/bff/auth/logout`
- `POST /api/bff/auth/verify-email`
- `POST /api/bff/auth/resend-verification`
- `GET /api/bff/auth/me`

The BFF layer is responsible for:

- forwarding requests to the backend API
- shaping standardized user-facing error responses
- avoiding direct backend leakage into the browser
- working with auth cookies/session behavior in a frontend-safe way

## Auth Flows Implemented

### Registration

Users can register through `/register`.

In local/testing environments, the registration success UI may surface a **dev verification token** to support local development and end-to-end testing without real email delivery.

### Verify Email

Users can verify their email through:

- `/verify-email?token=...`

The page reads the token from the query string, submits it through the BFF, and shows:

- loading state
- success state
- error state

### Resend Verification

Users can request a new verification email through:

- `/resend-verification`

The page intentionally shows a **generic success message** to avoid account enumeration:

> If an account exists and is unverified, we sent a new email.

### Login / Account

Users can sign in at `/login` and are redirected to `/account` after successful authentication.

The account page currently displays session/auth information such as:

- authenticated status
- email
- user id
- roles
- email verified state

## Local Development

### 1. Install dependencies

```bash
npm ci
```

### 2. Start the frontend

```bash
npm run dev
```

By default, the app runs at:

- `http://localhost:3000`

## Backend Requirements

Many frontend features depend on the Mineral Kingdom backend being available.

The frontend BFF expects the backend API to be reachable via `API_BASE_URL`.

Typical local value:

```bash
API_BASE_URL=http://localhost:8080
```

For auth-related local E2E flows, the backend should be running in a **testing/dev-friendly mode** that supports the verification-token strategy used by the frontend tests.

## End-to-End Testing

The frontend includes Playwright end-to-end coverage for auth and BFF flows.

### Canonical auth happy path

The canonical onboarding/auth happy-path test is:

- `e2e/register-verify-login.spec.ts`

It covers:

- register
- obtain a verification token using the local/dev token strategy
- verify email
- log in successfully

### Other focused E2E coverage

The suite also includes narrower specs for:

- registration validation and success state
- verify-email success and missing-token states
- resend-verification success state
- authenticated redirect/login/logout behavior
- BFF/cart/SSE smoke coverage

## Password reset E2E

The password reset E2E flow uses a deterministic dev-token strategy in Testing mode. No real email delivery is required.

## Admin allow-path E2E fixture

The forbidden-path admin test runs by default using a normal registered USER.

An optional admin allow-path test can also run when seeded admin credentials are available:

```bash
E2E_ADMIN_EMAIL=staff@example.com
E2E_ADMIN_PASSWORD=StrongPassword123!
```

### How it works
- The backend runs in `Testing`
- The password reset request BFF route surfaces `resetToken` when available from the backend in dev/testing
- Playwright captures that token from the BFF response
- The test opens `/password-reset/confirm?token=...`
- The test submits a new password and then logs in with the updated password

### Local setup
When running frontend E2E against the local Docker backend, use backend `.env` values such as:

```env
ASPNETCORE_ENVIRONMENT=Testing
MK_JWT__Issuer=mineral-kingdom
MK_JWT__Audience=mineral-kingdom-web
MK_JWT__SigningKey=CI_DEV_ONLY_CHANGE_ME_LONG_RANDOM_STRING_1234567890

### Token strategy

E2E tests do **not** rely on real email delivery.

In local/testing environments, the registration success UI surfaces a dev verification token. The Playwright auth happy-path tests read that token from the UI and use it to complete `/verify-email`.

### Local requirements

To run backend-dependent E2E tests locally, make sure:

- the backend API is running
- the database is running
- migrations have been applied
- the frontend app is running
- `E2E_BACKEND=1` is set

### Run locally

```bash
npm run lint
npm run build
E2E_BACKEND=1 npm run test:e2e
```

### CI

CI uses the same testing/dev-token strategy and does not depend on a real email inbox or SMTP delivery.

## Notes

### Auth navigation

Login and logout currently use hard navigation to avoid stale client-side auth state during cookie/session transitions.

### Middleware warning

If you see a Next.js warning about `middleware` being deprecated in favor of `proxy`, that is currently a framework cleanup item and does not block the auth flows or Playwright coverage.

## Goals of This Frontend Phase

This phase of the frontend is focused on building a reliable auth experience and stable full-stack test coverage before expanding deeper into marketplace, auction, and role-based experiences.
