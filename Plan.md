# Unify: Personal Operating System & Integrated Platform Plan

## Current Implementation Snapshot

The project is no longer planning-only. The current codebase already includes:

- Auth: email/password registration and login with NextAuth credentials.
- Dashboard shell: authenticated sidebar layout with dashboard, garage, sharing, and Mini SaaS routes.
- Digital Garage: vehicle CRUD foundation, trim-aware vehicle creation, recent log activity, and default branded card imagery when no user photo exists.
- Secure Sharing: local file uploads, expiring links, password-protected links, revoke/delete controls, per-user file lists, and activity history.
- Mini SaaS Finance: CSV transaction import, tracked financial sources/accounts, income vs spending summaries, category rollups, and recent transaction views.

Current operational notes:

- Prisma migrations now include auth, secure sharing, and finance-import modules.
- Uploaded files are stored on local disk.
- Default garage card imagery currently uses app-local generated fallback visuals instead of hotlinking third-party images at runtime.
- Live bank login is intentionally deferred; CSV import is the current finance MVP.

## 0. Guiding Principle: Free-First Self-Hosting

Build the smallest system that can run reliably on one machine with no monthly SaaS bill.

### Default Rule
- Start with one app, one database, one storage location, and one reverse proxy.
- Do not add paid hosted services unless they remove a real bottleneck.
- Prefer open-source tools with simple export and backup paths.
- Delay horizontal scaling until the app has real usage pressure.

### Cost Control Targets
- **Target monthly cost:** $0 if hosted at home, or one low-cost VPS if public uptime matters.
- **Target ops model:** Docker Compose, not Kubernetes.
- **Target storage model:** local bind mounts first, S3-compatible storage only when needed.
- **Target services count for MVP:** app + database + reverse proxy.

---

## A. Architecture

### 1. Recommended Tech Stack

### MVP Stack
- **Frontend + Backend:** Next.js with TypeScript. Use route handlers/server actions for the MVP instead of splitting services early.
- **Styling:** Tailwind CSS. Add Shadcn UI selectively, not wholesale.
- **Database:** PostgreSQL.
- **ORM:** Prisma.
- **Authentication:** Auth.js/NextAuth credentials-based auth is already in place. Keep email/password for the current self-hosted MVP unless real multi-provider needs appear.
- **File Storage:** Local filesystem via Docker bind mount.
- **Logging:** Pino to stdout.

### Defer Until Needed
- **Redis:** Skip for MVP. Use database-backed workflows and simple in-process jobs first.
- **MinIO:** Skip for MVP unless you need multi-node object storage or S3 compatibility.
- **Separate backend service:** Skip until Next.js server boundaries become painful.
- **Queue system:** Skip until background jobs become long-running or failure-sensitive.

### Why This Version Is Cheaper
- Fewer containers means less RAM, less disk, less breakage.
- Local files are free and simpler than managing object storage.
- PostgreSQL can cover more than people think before Redis is necessary.
- One deployable app is easier to back up and restore.

### 2. Repo Strategy

### Recommendation
- Start with a single Next.js app unless you already know multiple apps/packages will be maintained in parallel.
- Add a monorepo only when shared packages are real, not speculative.

### If You Still Want a Monorepo
- **Structure:** Turborepo.
- **Packages:**
  - `apps/web`: Main Next.js app.
  - `packages/ui`: Shared React components, only after duplication appears.
  - `packages/db`: Prisma client and schema, if separation becomes useful.
  - `packages/utils`: Shared helpers.
  - `packages/types`: Shared types if multiple packages truly consume them.

### 3. API Design Principles
- **Start simple:** Internal app routes and server-side functions first.
- **Response format:** Consistent JSON shape for public/API-key endpoints.
- **Auth boundary:** Keep internal browser/session auth separate from future API-key integrations.
- **Versioning:** Only version external APIs. Do not over-version internal app code.

### 4. Security Considerations
- **Encryption at rest:** Encrypt only genuinely sensitive Secure Sharing content, not every table by default.
- **Encryption in transit:** HTTPS/TLS everywhere outside localhost.
- **Rate limiting:** Add on auth, password reset, and secret-link access.
- **Secrets management:** Store keys in environment variables and document rotation.
- **Privacy:** Burn-after-read logic should be enforced server-side and reflected in the database state.
- **Backups:** An unencrypted backup of encrypted app data can still leak metadata, so treat backup access as sensitive.

---

## B. Database Schema (PostgreSQL)

### 1. Shared Tables
- **`User`**: ID, email, password_hash, name, avatar, role.
- **`Session`**: Session tracking if your auth library requires it.
- **`Account`**: OAuth provider links if social login is enabled.
- **`Setting`**: User-specific preferences (JSONB: theme, notifications, dashboard config).
- **`Notification`**: ID, user_id, type, content, is_read, created_at.
- **`File`**: ID, filename, path, mimetype, size, uploader_id, is_public, created_at.
- **`FileActivity`**: User-scoped file/share audit trail for uploads, link creation, revocation, and access events.

### 2. Digital Garage Module
- **`Vehicle`**: ID, owner_id, make, model, trim, year, nickname, vin, photo_url.
- **`LogEntry`**: ID, vehicle_id, type (MOD, REPAIR, MAINTENANCE), date, title, description, odometer, cost.
- **`Part`**: ID, name, part_number, vehicle_id, status (INSTALLED, WISHLIST, REPLACED).
- **`Attachment`**: ID, log_entry_id, file_id.

### 3. Secure Sharing Module
- **`SecretLink`**: ID, slug, owner_id, file_id, type (FILE, TEXT, MESSAGE), content_encrypted, password_hash, expires_at, view_limit, view_count, is_burned, revoked_at, last_accessed_at.

### 4. Mini SaaS Utilities
- **`Habit`**: ID, user_id, name, frequency, color, target.
- **`HabitLog`**: ID, habit_id, date, status.
- **`Subscription`**: ID, user_id, service_name, amount, currency, billing_cycle, next_billing_date.
- **`BudgetItem`**: ID, user_id, category, amount, date, type (INCOME, EXPENSE).
- **`TimeEntry`**: ID, user_id, task_name, start_time, end_time, duration.
- **`FinancialConnection`**: Provider-backed or manual-import source, sync state, institution label, and future token storage.
- **`FinancialAccount`**: Imported or connected account metadata (checking, savings, credit card, cash, other).
- **`FinancialTransaction`**: Posted date, description, category, amount, direction, and dedupe fingerprint for imported or synced transactions.

### Schema Advice
- Add timestamps (`created_at`, `updated_at`) consistently from day one.
- Add soft delete only where recovery is useful. Do not add it everywhere by reflex.
- Use enums carefully. They are helpful, but too many rigid enums can slow future feature changes.
- Store large files outside Postgres. Keep metadata in the database and file bytes on disk.

---

## C. Feature Breakdown

### 1. Digital Garage
- **MVP:** Vehicle CRUD, log entries, photo uploads, simple timeline.
- **Current state:** Vehicle creation and deletion exist; default model imagery is shown automatically when a user has not added a custom vehicle photo.
- **Stretch:** OBD2 parsing/graphs, maintenance reminders, part price tracking.
- **Cost note:** OBD2 analytics may justify a separate worker later, but not before usage proves it.

### 2. Secure Sharing
- **MVP:** Encrypted text pastes, file uploads with expiration, burn-after-reading.
- **Current state:** File uploads, revocable links, password-protected links, download limits, delete flow, and account-scoped activity/history are implemented.
- **Stretch:** QR code generation, password-protected links, download/view stats.
- **Cost note:** File expiry can start as a daily cleanup task instead of introducing a queue service.

### 3. Mini SaaS Utilities
- **MVP:** Transaction import, spending vs income summary, source/account tracking, and a finance-first dashboard.
- **Current state:** CSV import is implemented as the initial finance path. Live bank connections are deferred, but the schema is prepared for future Plaid or Teller integration.
- **Stretch:** Habit streaks, renewal notifications, budget charts, time tracking.
- **Scope note:** Keep this section intentionally narrow or it can consume the whole project.

### 4. Personal Dashboard
- **MVP:** Login, sidebar, recent activity, storage usage, quick links.
- **Current state:** Authenticated dashboard shell is implemented and linked to real garage/sharing/finance counts and recent entities.
- **Stretch:** Command bar, widget drag/drop, richer notifications.

---

## D. UI/UX Structure

### 1. Global Layout
- **Sidebar:** Module-based navigation.
- **Header:** Search, notifications, profile menu.
- **Content area:** Dense layouts where needed, simple cards where not.

### 2. Component Library Plan
- **Forms:** Inputs, selects, textareas, date fields.
- **Data display:** Tables with filtering/sorting only when the screen truly needs it.
- **Feedback:** Toasts, modals, loading states.

### UI Advice
- Avoid building a giant design system before core workflows are usable.
- Favor durable utility components over decorative abstractions.
- Mobile support matters early if you will use this in the garage, on the road, or while sharing files.

---

## E. Development Roadmap

| Phase | Description | Key Milestones | Complexity | Cost Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | Core Foundation | Next.js app, PostgreSQL, auth, dashboard shell, local file storage | Medium | Lowest |
| **Phase 2** | Digital Garage | Vehicle/log CRUD, attachment uploads, timeline UI | Medium | Low |
| **Phase 3** | Secure Sharing | Encrypted text/files, expiration, burn-after-read, link UI | Medium | Low |
| **Phase 4** | Utilities | Finance import, spending/income summary, then habits/subscriptions | Medium | Low |
| **Phase 5** | Hardening | Backups, restore docs, Docker Compose, reverse proxy, monitoring | Medium | Low |
| **Phase 6** | Optional Scale Upgrades | Redis, MinIO, workers, API versioning, monorepo extraction | High | Higher |

### Roadmap Advice
- Move Dockerization and backup strategy earlier than “final polish.” For self-hosting, deployment and recovery are core features.
- Treat restore testing as a milestone, not just backup creation.
- Only add Redis/MinIO in Phase 6 unless the app clearly outgrows the simpler model.

---

## F. Deployment & Self-Hosting

### 1. Recommended Free-First Setup

### Home Server Path
- **Host:** Old mini PC, used office PC, NAS with Docker support, or always-on home server.
- **Runtime:** Docker Compose.
- **Containers:** `app`, `db`, `caddy` or `traefik`.
- **Storage:** Bind mounts for uploads and backups.
- **Remote access:** Tailscale.

### Cheap VPS Path
- **Use this only if you need public uptime or do not want to manage home networking.**
- One small VPS can run the whole stack if file growth is modest.
- Keep uploads and database backups on attached volume storage if available.

### 2. Reverse Proxy and TLS
- **Simplest choice:** Caddy. It is easier than manually managing Certbot.
- **Alternative:** Traefik if you prefer Docker-label-driven routing.
- **Avoid complexity:** Nginx Proxy Manager is fine, but it adds another UI and service to maintain.

### 3. Storage Strategy
- **MVP:** Local filesystem with a clear mount path such as `/data/uploads`.
- **Backups:** Copy both Postgres dumps and uploads.
- **Upgrade trigger for MinIO:** multi-instance deployments, S3 API requirements, or large storage growth.

### 4. Jobs and Cleanup
- Use a simple cron container or host cron for daily cleanup jobs and backups.
- Do not introduce a queue broker just for file expiration.

### 5. Monitoring & Backups
- **Logs:** Pino to stdout, inspect with `docker compose logs`.
- **Health checks:** Basic container health checks and an app `/health` endpoint.
- **Backups:** Daily `pg_dump`, regular upload directory snapshots, and periodic restore tests.
- **Alerting:** Optional email or push alert only after the app becomes important enough to justify it.

### 6. Free-Hosting Reality Check
- Self-hosting is not truly free if you count electricity, domain name, backup media, and your time.
- The cheapest reliable setup is usually:
  - home server + Tailscale for private access
  - or one small VPS + Docker Compose for public access
- Avoid any architecture that assumes managed Redis, managed database, or cloud object storage from the start.

---

## G. Long-Term Extensibility

- **Plugin system:** Defer until the core modules are stable. A plugin system too early creates maintenance cost.
- **Mobile friendly:** Build responsive layouts first. Add PWA support later if it materially improves use.
- **Theming:** CSS variables are a good low-cost choice.
- **API versioning:** Add `/api/v1` only for endpoints you expect third parties or mobile clients to consume.

---

## H. Recommended Final Direction

If the goal is to keep this project as free as possible, the most sensible first version is:

- Next.js + TypeScript
- PostgreSQL
- Prisma
- Local file storage
- Simple auth
- Docker Compose
- Caddy
- Tailscale for private remote access

Skip Redis, MinIO, monorepo extraction, separate services, and advanced monitoring until real usage demands them.

That gives you the best balance of:
- low monthly cost
- manageable operational complexity
- easy backups
- room to scale later without rewriting the whole app
