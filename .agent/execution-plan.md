# 🚀 Master Execution Plan - Abogado Sala

This document is the **Sequential Runbook** for an autonomous agent (or dev team) to build the entire SaaS from scratch, ensuring "Zero Failure" by respecting dependencies.

---

## Phase 1: Database Initialization (The Foundation)

**Context**: `[.agent/sql]`
**Dependency**: Supabase Project Created & Env Vars set.

1.  **Init & Extensions**:
    - Run `00-init.sql`: Sets up extensions (`pg_trgm`) and core auth helper functions.
2.  **Schema Definition**:
    - Run `01-tables.sql`: Creates `organizations`, `profiles`, `cases`, etc.
3.  **Indexes**:
    - Run `02-indexes.sql`: Performance tuning for known query patterns.
4.  **Security Layer (RLS)**:
    - Run `03-rls.sql`: Enables RLS and applies defined policies.
5.  **Automation (Triggers)**:
    - Run `04-triggers.sql`: Activates Quota enforcement, "Anti-Coup", and Storage logic.
6.  **Business Logic (RPCs)**:
    - Run `05-functions.sql`: Adds `check_rate_limit` and other protected RPCs.

👉 **Verification**: Run the "Consistency Check" described in `backend/schema-design.md`.

---

## Phase 2: Backend & Infrastructure Setup

**Context**: `[.agent/backend]`

1.  **Environment Config**:
    - Read `environment-variables.md`.
    - Create `.env.local` using the defined keys.
2.  **Type Generation**:
    - Run `supabase gen types` to create `src/lib/database.types.ts`.
3.  **Storage Setup**:
    - Create Buckets `secure-docs` and `assets` as per `security-model.md`.
    - Apply Storage Policies (defined in `03-rls.sql` conceptually, but need Storage API calls or dashboard config).

---

## Phase 3: Frontend Construction - Layer 1 (Core)

**Context**: `[.agent/frontend]` & `src/lib`

1.  **Foundation**:
    - Read `foundation-module.md` & `architecture.md`.
    - Setup `Shadcn UI` foundation.
    - Implement `theme` and `layout` (Font, Colors).
2.  **Auth Module**:
    - Implement `features/auth` based on `auth-module.md`.
    - Components: `LoginForm`, `SignUpForm` (with Org creation).

---

## Phase 4: Frontend Construction - Layer 2 (Dashboard)

1.  **Layout Implementation**:
    - Read `layout-module.md`.
    - Build `DashboardShell`, `Sidebar`, `UserNav`.
2.  **Client Management**:
    - Read `clients-module.md`.
    - Build `ClientList`, `NewClientDialog`.
3.  **Billing Integration**:
    - Read `billing-module.md`.
    - Implement `UpgradePlan` modal and Stripe Checkout redirection.
4.  **Error & State**:
    - Read `state-management.md` and `error-handling-monitoring.md`.
    - Wrap App in `Providers` (QueryClient, Toaster).
    - Create `global-error.tsx`.

---

## Phase 5: The "War Games" Hardening

**Context**: `[.agent/sql]` & `security-model.md`

1.  **Rate Limiting Middleware**:
    - Implement `middleware.ts` using logic from `security-model.md`.
2.  **Upload Hardening**:
    - Implement `portal-module.md` upload flow using Signed URLs.
    - Verify `04-triggers.sql` is effectively blocking quota breaches.

---

## ✅ Ready for Launch

If all steps are executed in order, the system is mathematically guaranteed to match the specifications.
