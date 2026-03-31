# Repository Guidelines

## Project Structure & Module Organization
This repository is an active Next.js application, not a planning-only workspace anymore. The main planning/reference document is [`Plan.md`](/ai/Unify/Plan.md), and the implemented app now lives under [`src/`](/ai/Unify/src) with Prisma schema and migrations under [`prisma/`](/ai/Unify/prisma).

Current important paths:
- `src/app/(auth)/` for login and registration routes
- `src/app/(dashboard)/` for authenticated dashboard modules
- `src/app/api/` for route handlers
- `src/app/join/[token]/` for workspace invite acceptance
- `src/components/dashboard/` for dashboard/shared authenticated UI
- `src/components/garage/` for garage-specific UI
- `src/lib/actions/` for server actions
- `src/lib/` for Prisma, auth helpers, workspace helpers, finance helpers, sharing helpers, and car catalog data
- `prisma/schema.prisma` for the live schema
- `prisma/migrations/` for applied migrations
- `docker-compose.yml` for the local Postgres service

Current implemented modules:
- Auth: credentials-based registration/login with NextAuth/Auth.js
- Dashboard: authenticated sidebar layout with real counts/recent data
- Digital Garage: vehicle creation/deletion, trim-aware car catalog, default local card imagery, recent log activity
- Secure Sharing: file upload, expiring links, password protection, revoke/delete flows, activity history
- Mini SaaS Finance: CSV transaction import, duplicate-safe reimports, tracked accounts/sources, date-range-aware reporting, automatic categorization, clear-all reset
- Workspace Collaboration: personal workspaces, shared workspaces, workspace switcher, invite links, pending invite management, member role updates/removal, workspace-scoped access control

Current known direction:
- Garage uses local default card visuals when no custom vehicle photo exists
- Secure Sharing uses local disk storage
- Finance MVP is CSV import first; live bank sync is deferred
- Workspace collaboration is now the tenancy model for app data; current UI still defaults new users to a personal workspace first
- The repo currently has no `public/` directory and no standalone docs/infra split yet

## Build, Test, and Development Commands
The app is runnable today. Standard commands:
- `npm install` to install dependencies
- `npm run dev` to start local development
- `npm run build` to create a production build
- `docker compose up -d db` to start the local PostgreSQL database
- `docker compose stop db` to stop the local PostgreSQL database
- `npx prisma migrate deploy` to apply pending migrations to the running database
- `npx prisma generate` to regenerate the Prisma client after schema changes

Operational notes:
- Most authenticated routes require the database to be running
- If dev runtime errors look stale but `npm run build` passes, restart `npm run dev` before changing code
- Current auth env vars use `AUTH_SECRET` and `NEXTAUTH_URL`
- Current workspace foundation migration is `20260330120000_workspace_foundation`
- Current local database state assumes the finance migration history has been reconciled and `npx prisma migrate status` reports up to date

## Coding Style & Naming Conventions
Use TypeScript for application code and keep formatting automated. Prefer:
- 2-space indentation
- `camelCase` for variables/functions
- `PascalCase` for React components and types
- `kebab-case` for filenames and route segments

Use ESLint and Prettier once the app scaffold exists. Keep modules small and avoid speculative abstractions.

Project-specific implementation notes:
- Prefer server actions for authenticated mutations
- Prefer Prisma queries scoped through the current authenticated workspace, not just the current user
- Use `src/lib/workspaces.ts` helpers for workspace resolution and permission checks instead of re-implementing access logic inline
- When touching garage catalog logic, check [`src/lib/car-data.ts`](/ai/Unify/src/lib/car-data.ts) because model entries now use `{ trims, photoUrl }`
- When touching dashboard auth behavior, remember session `user.id` is populated via NextAuth JWT/session callbacks
- For destructive sharing actions, preserve confirmation steps in the UI
- When touching finance imports, preserve duplicate filtering and workspace-scoped `sourceHash` behavior
- When touching workspace flows, remember invite delivery is currently manual copy/share of the generated join link; there is no email provider integration yet
- Owner/member role management is implemented in the workspace UI, but owner transfer/removal is not yet supported from the screen

## Testing Guidelines
Add tests alongside implementation, not as a cleanup task. Recommended defaults:
- unit/integration tests: `*.test.ts` or `*.test.tsx`
- end-to-end tests: `tests/e2e/*.spec.ts`

Prioritize coverage for auth, secure sharing, backups, and file handling. Any self-hosting or restore workflow should be verified by a real test or scripted check.
Prioritize coverage for workspace permission checks, invite acceptance, role updates, and workspace-scoped data access across Garage, Sharing, and Finance.

Until a formal test suite exists, use `npm run build` as the minimum regression check after meaningful app changes.

## Commit & Pull Request Guidelines
No git history is available in this workspace, so no established commit pattern can be inferred. Use Conventional Commits for consistency, for example `feat: add vehicle model` or `fix: handle expired secret links`.

Pull requests should include:
- a short description of the change
- linked issue or task reference when applicable
- screenshots for UI changes
- notes about env vars, migrations, or deployment impact

## Security & Configuration Tips
Do not commit secrets, `.env` files, database dumps, or uploaded user files. Prefer local-first, low-cost infrastructure: Docker Compose, Postgres, bind-mounted uploads, and documented backups.

Additional current notes:
- Sharing uploads and generated files should remain out of git
- Finance imports may include sensitive transaction history; treat imported CSVs and raw transaction payloads as sensitive data
- If a Prisma migration fails locally, fix the migration and reconcile `_prisma_migrations` carefully before reapplying
- Workspace safety is server-enforced: UI affordances are not sufficient without matching server-side role and workspace checks
- Current workspace permissions are enforced for Garage write actions, Sharing write/delete actions, Finance import/clear actions, and workspace member/invite management
