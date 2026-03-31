# GEMINI.md - Project Context & Instructions

## Project Overview
**Unify** is a self-hosted "Personal Operating System" designed as a cohesive platform for managing personal data, vehicles, and utilities. The project prioritizes a **Free-First Self-Hosting** principle, aiming for minimal operational costs and architectural simplicity.

### Core Modules
1.  **Digital Garage:** Car project tracker for mods, repairs, maintenance, and parts inventory.
2.  **Secure Sharing:** Encrypted file/text sharing with expiration and "burn after reading" features.
3.  **Mini SaaS Utilities:** Personal tools including habit tracking, subscription management, and budgeting.
4.  **Personal Dashboard:** Unified entry point with notifications, settings, and system health widgets.

---

## Technical Stack
-   **Frontend & Backend:** Next.js (TypeScript) using Route Handlers and Server Actions.
-   **Styling:** Tailwind CSS + Shadcn UI (selective usage).
-   **Database:** PostgreSQL with Prisma ORM.
-   **Authentication:** Better Auth or Auth.js (NextAuth).
-   **File Storage:** Local filesystem via Docker bind mounts (MVP).
-   **Reverse Proxy:** Caddy or Traefik.
-   **Deployment:** Docker Compose.

---

## Development Roadmap & Milestones
-   **Phase 1 (Foundation):** Setup Next.js, PostgreSQL, Auth, and Dashboard shell.
-   **Phase 2 (Digital Garage):** Implement vehicle/log CRUD and file attachments.
-   **Phase 3 (Secure Sharing):** Encryption logic, expiration tasks, and sharing UI.
-   **Phase 4 (Utilities):** Habit, subscription, and budget modules.
-   **Phase 5 (Hardening):** Dockerization, backups, and reverse proxy setup.

---

## Key Files & Directories
-   `Plan.md`: Detailed architecture, schema, and roadmap (The source of truth for this project).
-   `GEMINI.md`: This file, providing context for AI interactions.
-   `prisma/schema.prisma`: (TODO) Database schema definitions.
-   `src/app/`: (TODO) Next.js application routes and logic.
-   `docker-compose.yml`: (TODO) Container orchestration.

---

## Building and Running
*Note: These commands are inferred and may need adjustment once the project structure is initialized.*

### Development
-   `npm install` - Install dependencies.
-   `npx prisma generate` - Generate Prisma client.
-   `npm run dev` - Start the Next.js development server.

### Database
-   `npx prisma migrate dev` - Run database migrations.
-   `npx prisma studio` - Open database GUI.

### Production / Deployment
-   `docker-compose up -d` - Start the stack in detached mode.
-   `npm run build` - Build the Next.js application.

---

## Development Conventions
-   **Simplicity First:** Avoid over-engineering. Delay Redis, MinIO, or microservices until strictly necessary.
-   **Security:** AES-256-GCM for sensitive shared content. Mandatory HTTPS in production.
-   **Data Integrity:** Consistent use of `created_at` and `updated_at` timestamps.
-   **Responsive Design:** Prioritize mobile-friendly layouts for on-the-go usage (e.g., in the garage).

---

## Instructions for Gemini
-   Refer to `Plan.md` for detailed feature requirements and database relationships.
-   Follow the "Free-First" guiding principle: prefer simple, local solutions over paid or complex cloud services.
-   Maintain a monorepo-ready structure within the Next.js app until shared packages are explicitly required.
-   Always include migration scripts or schema updates when modifying data structures.
