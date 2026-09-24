# IT Help Desk Ticketing System

Simple internal ticketing app. Next.js App Router + MySQL (raw SQL via
`mysql2`, no ORM) + Material UI + NextAuth (Credentials) + Zod.

## Stack

- **Next.js 14** (App Router, TypeScript) — UI + API routes in one app
- **MySQL** via `mysql2/promise` — connection pool, no ORM
- **Material UI v5** + `@mui/x-data-grid` — all UI, including the ticket table
- **NextAuth.js** (Credentials provider, JWT sessions) — auth
- **Zod** — validates every API input before it touches the database
- **bcryptjs** — password hashing

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create the database**
   ```bash
   mysql -u root -p -e "CREATE DATABASE helpdesk"
   mysql -u root -p helpdesk < db/schema.sql
   ```
   This also seeds one admin account: `admin@company.com` / `Admin@123`.
   **Change this password immediately** — see step 4.

3. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your DB credentials and generate a NextAuth secret:
   ```bash
   openssl rand -base64 32
   ```

4. **(Recommended) Reset the seeded admin password**
   ```bash
   npm run hash-password -- "YourNewStrongPassword"
   ```
   Copy the output hash and run:
   ```sql
   UPDATE users SET password_hash = '<hash>' WHERE email = 'admin@company.com';
   ```

5. **Run it**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`, sign in as admin, then use **Users** to
   create agent and employee accounts (there's no public self-signup —
   internal tools shouldn't have one).

## Roles & access

| Action | Employee | Agent | Admin |
|---|:---:|:---:|:---:|
| Create ticket | ✅ | ✅ | ✅ |
| View own tickets | ✅ | ✅ | ✅ |
| View **all** tickets | ❌ | ✅ | ✅ |
| Comment | ✅ (own tickets) | ✅ | ✅ |
| Change status / priority / assignee | ❌ | ✅ | ✅ |
| Delete ticket | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

Enforcement is **defense in depth**:
- `middleware.ts` blocks unauthenticated requests to protected routes and
  keeps non-admins out of `/admin/*`.
- Every API route independently re-checks `getCurrentUser()` and role via
  `hasRole()` — the UI hiding a button is not treated as security.
- Employee ticket queries are hard-scoped to `created_by = self` at the SQL
  level, not filtered client-side.

## Project structure

```
app/
  api/                    API routes (see below)
  login/                  Public login page
  (dashboard)/            Route group — everything behind AppShell nav
    dashboard/            Stat cards (role-aware)
    tickets/               List (DataGrid + filters)
    tickets/new/            Create form
    tickets/[id]/           Detail + status/priority/assignee controls + comments
    admin/users/            User CRUD (admin only)
lib/
  db.ts                   mysql2 pool + query/execute helpers
  auth.ts                 NextAuth config + getCurrentUser/hasRole
  validators.ts           All Zod schemas
components/
  AppShell.tsx            Top nav, role-aware links
  ThemeRegistry.tsx        MUI + Emotion SSR setup for App Router
  AuthProvider.tsx         NextAuth SessionProvider wrapper
  StatusChip.tsx / PriorityBadge.tsx
db/schema.sql             Full CREATE TABLE statements + seed admin
```

## API routes

| Route | Methods | Notes |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/tickets` | GET, POST | List (filtered/paginated/role-scoped), create |
| `/api/tickets/:id` | GET, PATCH, DELETE | Detail, update (agent/admin), delete (admin) |
| `/api/tickets/:id/comments` | GET, POST | Comment thread |
| `/api/tickets/:id/assign` | POST | Agent claims a ticket for themself |
| `/api/users` | GET, POST | Admin: list/create. Agent: narrow lookup for assignee pickers |
| `/api/users/:id` | PATCH | Admin: edit role/department/active/password |
| `/api/categories` | GET | Lookup list for dropdowns |
| `/api/stats` | GET | Ticket counts by status/priority (agent/admin) |

## Deliberately out of scope for v1

SLA timers/escalation, email notifications, file attachments, multi-tenant
orgs, public self-signup. The schema and API shape don't block adding these
later — `ticket_attachments` isn't in the current schema but would slot in
next to `ticket_comments` the same way.
