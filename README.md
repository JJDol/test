# Aticon AutoDOC

A multi-tenant SaaS platform for architecture and construction professionals. Manages construction projects, DOCX document templates with variable extraction/generation, team collaboration with role-based access, and AI-powered semantic search over documents and Danish building regulations (BR18).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Authentication & Authorization](#authentication--authorization)
- [Key Features & Modules](#key-features--modules)
- [API Routes](#api-routes)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Branch Strategy](#branch-strategy)
- [Useful Commands](#useful-commands)
- [Additional Documentation](#additional-documentation)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer              | Technology                                                  |
| ------------------ | ----------------------------------------------------------- |
| Framework          | Next.js 15 (App Router, standalone output)                  |
| Language           | TypeScript 5.7                                              |
| UI                 | React 18, Tailwind CSS 3.4, shadcn/ui (Radix primitives)   |
| Icons              | Heroicons, Lucide                                           |
| Database           | PostgreSQL 15 via Supabase (Row-Level Security)             |
| Auth               | Supabase Auth (JWT, cookie-based sessions)                  |
| AI / LLM           | OpenAI API (GPT + `text-embedding-ada-002`)                 |
| Vector DB          | Qdrant Cloud                                                |
| File Storage       | Vercel Blob (large files) + Supabase Storage                |
| Doc Processing     | `docxtemplater`, `mammoth`, `pdf-parse`, `cheerio`          |
| Drag & Drop        | `@hello-pangea/dnd`                                         |
| Hosting            | Vercel                                                      |
| CI/CD              | GitHub Actions                                              |

---

## Architecture Overview

```
┌──────────────────┐      ┌──────────────────┐
│  Next.js 15      │─────▶│  Supabase        │
│  (App Router)    │      │  Auth + Postgres  │
│  React 18 + TS   │◀─────│  RLS policies    │
└──────────────────┘      └──────────────────┘
        │                          │
        ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│  OpenAI API      │      │  File Storage    │
│  + Qdrant Cloud  │      │  Vercel Blob +   │
│  (Vector Search) │      │  Supabase Storage│
└──────────────────┘      └──────────────────┘
```

**Request flow**: Browser → Next.js middleware (auth guard) → App Router pages / API routes → Supabase DB + external services.

---

## Project Structure

```
├── app/                         # Next.js App Router
│   ├── (auth-pages)/            # Sign-in, sign-up, forgot-password
│   ├── api/                     # ~50 API route handlers (see API Routes)
│   ├── protected/               # Authenticated pages
│   │   ├── dashboard/           # Main dashboard + project detail
│   │   ├── documents/           # Document management
│   │   ├── kanban/              # Kanban board
│   │   ├── semantic-engine/     # AI chat interface
│   │   ├── templates/           # Template management
│   │   └── variables/           # Variable management
│   └── layout.tsx               # Root layout (ThemeProvider, header, sidebar)
├── components/                  # React components by domain
│   ├── ui/                      # Shared primitives (shadcn/ui)
│   ├── dashboard/               # Dashboard views
│   ├── documents/               # Document UI
│   ├── kanban/                  # Kanban board
│   ├── semantic/                # AI chat components
│   ├── templates/               # Template UI
│   └── auth/                    # Auth forms, guards, session
├── hooks/                       # Custom React hooks
│   ├── use-dashboard.ts         # Dashboard data
│   ├── use-documents.ts         # Document CRUD
│   ├── use-kanban.ts            # Kanban state
│   ├── use-semantic-engine.ts   # AI chat logic
│   ├── use-templates.ts         # Template management
│   └── use-project-*.ts         # Project data / actions / variables
├── lib/                         # Core libraries
│   ├── auth/                    # Auth module (core, middleware, JWT, helpers)
│   ├── services/
│   │   ├── ai/                  # OpenAI client, query engine, doc processor
│   │   ├── integrations/        # BR18 ingestion, storage, Qdrant vector store
│   │   ├── processors/          # DOCX generation, content controls, images
│   │   └── extractors/          # Variable extraction from templates
│   ├── supabase/                # Supabase clients (browser, server, service-role)
│   └── types/                   # TypeScript type definitions
├── supabase/
│   ├── config.toml              # Local Supabase dev config
│   └── migrations/              # 27 SQL migration files
├── scripts/                     # Utility scripts (pgvector, category restore)
├── docs/                        # Extended documentation (API docs, guides)
├── .github/workflows/           # CI/CD (deploy-production, deploy-dev, validate)
├── middleware.ts                 # Auth routing guard
└── next.config.ts               # Standalone output, 50MB body limit, CORS
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (20 recommended)
- **npm** (comes with Node)
- **Supabase CLI** (`npm install -g supabase`)
- A **Supabase** project (or use local dev with `npx supabase start`)
- An **OpenAI** API key
- A **Qdrant Cloud** cluster
- A **Vercel** account (for Blob storage token + deployment)

### 1. Clone and install

```bash
git clone <repo-url>
cd aticon-autodoc
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local` (see [Environment Variables](#environment-variables) below).

### 3. Set up the database

**Option A — Remote Supabase project:**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — Local Supabase (requires Docker):**

```bash
npx supabase start       # Starts local Postgres, Auth, Storage
npx supabase db push     # Applies all migrations
```

The local Supabase dashboard will be at `http://localhost:54323`.

### 4. Start development server

```bash
npm run dev
```

The app runs at **http://localhost:3000**. You'll be redirected to `/sign-in`. Create a user via Supabase Auth dashboard or the sign-up page.

---

## Environment Variables

Create a `.env.local` file in the project root. All required variables:

```bash
# ── Supabase (required) ──────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# ── OpenAI (required for AI features) ────────────────────
OPENAI_API_KEY=sk-...

# ── Qdrant (required for vector/semantic search) ─────────
QDRANT_URL=https://xxxxxxxx.qdrant.io
QDRANT_API_KEY=...

# ── Vercel Blob (required for large file uploads) ────────
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# ── Application URLs ─────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
```

> **Note:** `VERCEL_URL` and `NODE_ENV` are auto-set when deployed on Vercel.

### Where to get these values

| Variable                       | Where to find it                                           |
| ------------------------------ | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`     | Supabase Dashboard → Settings → API → Project URL          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase Dashboard → Settings → API → `anon` public key    |
| `SUPABASE_SERVICE_ROLE_KEY`    | Supabase Dashboard → Settings → API → `service_role` key   |
| `OPENAI_API_KEY`               | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `QDRANT_URL`                   | Qdrant Cloud Dashboard → Cluster → URL                     |
| `QDRANT_API_KEY`               | Qdrant Cloud Dashboard → Cluster → API Key                 |
| `BLOB_READ_WRITE_TOKEN`        | Vercel Dashboard → Project → Storage → Blob → Token        |

---

## Database

### Overview

PostgreSQL 15 managed by Supabase. Row-Level Security (RLS) enforces multi-tenant isolation — every table is scoped to the user's company.

### Core tables

| Table                | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `companies`          | Tenant companies with subscription tiers               |
| `users`              | User profiles (linked to `auth.users`), roles, company |
| `projects`           | Construction projects with stages and variables        |
| `document_templates` | DOCX templates with extracted variable configs         |
| `project_templates`  | Bundles of document templates for project types        |
| `documents`          | Generated documents with embedding status              |
| `ai_documents`       | Uploaded docs for AI search with ingestion status      |
| `chat_sessions`      | AI chat conversation sessions                          |
| `chat_messages`      | Individual chat messages                               |
| `document_chunks`    | pgvector chunks for semantic search                    |

### User roles

`ADMIN` > `COMPANY_ADMIN` > `MANAGER` > `USER`

- **ADMIN**: System-wide access (BR18 ingestion, user management)
- **COMPANY_ADMIN**: Manage company users, templates, all projects
- **MANAGER**: Manage assigned projects and team
- **USER**: View and work on assigned projects

### Migrations

All in `supabase/migrations/` (27 files, chronologically ordered). They run automatically with `npx supabase db push`.

To create a new migration:

```bash
npx supabase db diff --schema public -f <migration_name>
```

### Key DB functions / triggers

- `handle_new_user()` — auto-creates a user profile when someone signs up via Supabase Auth
- `handle_user_delete()` — cleanup on user deletion
- `get_current_user_company_id()` — used in RLS policies for tenant isolation

---

## Authentication & Authorization

1. **Supabase Auth** handles sign-up, sign-in, password reset, and OAuth callbacks.
2. **Next.js middleware** (`middleware.ts`) runs on every request:
   - Validates the session cookie
   - Redirects unauthenticated users away from `/protected/*` and `/admin/*`
   - Redirects authenticated users away from `/sign-in`
   - Checks admin role for `/admin/*` routes
3. **API route protection** uses decorators from `lib/auth/middleware.ts`:
   - `withAuth(handler)` — requires authenticated user
   - `withRole(handler, roles)` — requires specific role(s)
   - `withAdmin(handler)` — requires ADMIN role

---

## Key Features & Modules

### Project Management
- CRUD projects with stages: `TODO` → `IN_PROGRESS` → `REVIEW` → `DONE`
- Assign team members and project leaders
- Track progress via template completion percentage
- Kanban board view with drag-and-drop

### Document Template Engine
- Upload `.docx` templates with placeholder variables (e.g., `{project_name}`)
- Automatic variable extraction from uploaded templates
- Template versioning and archiving
- Generate filled documents per project
- Seven document categories: Architecture, Constructions, Fire Safety, Authority Processing, Energy, HVAC, Execution Control

### AI Semantic Search
- Chat interface for querying project documents and BR18 regulations
- Two-stage retrieval: keyword pre-filter → vector similarity via Qdrant
- Document upload + automatic chunking and embedding (OpenAI `text-embedding-ada-002`)
- Source attribution with confidence scores
- Project-scoped context injection

### Multi-Tenancy
- Company-level data isolation via Supabase RLS
- Subscription tiers: Basic, Pro, Enterprise, Custom
- Usage tracking per company

### Invitation System
- Invite colleagues via email
- Token-based invitation acceptance flow
- Auto-assign to company on acceptance

---

## API Routes

All routes are under `app/api/`. Key groups:

| Group                  | Base Path                        | Description                           |
| ---------------------- | -------------------------------- | ------------------------------------- |
| Auth                   | `/api/auth/*`                    | Session, password reset, callbacks    |
| Projects               | `/api/projects/*`                | CRUD, variables, document generation  |
| Document Templates     | `/api/document-templates/*`      | Upload, extract variables, versioning |
| Project Templates      | `/api/project-templates/*`       | Template bundle management            |
| Semantic / AI          | `/api/semantic/*`                | Chat, search, document ingestion      |
| Users                  | `/api/users/*`                   | Profile, colleagues, invitations      |
| Admin                  | `/api/admin/*`                   | BR18 ingestion, cleanup, JWT mgmt     |
| Subscription           | `/api/subscription/*`            | Usage tracking                        |

Full API documentation is in `docs/api/`.

---

## Deployment

The app deploys to **Vercel** in standalone mode.

### Deploy to production

```bash
vercel --prod
# or
./deploy-production.sh
```

### Vercel project settings

- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Node.js Version**: 18.x or 20.x
- **Function Max Duration**: 600s (set in Vercel dashboard)
- **Function Memory**: 4096 MB
- **Region**: `iad1` (US East) — adjust as needed

### Required Vercel environment variables

Set all variables from [Environment Variables](#environment-variables) in the Vercel project settings. `VERCEL_URL` and `NODE_ENV` are set automatically.

### External services checklist

- [ ] Supabase project created and migrations applied
- [ ] Supabase Auth email templates configured (especially for invitations and password reset)
- [ ] OpenAI API key provisioned with sufficient quota
- [ ] Qdrant Cloud cluster running with a collection created
- [ ] Vercel Blob storage enabled on the project

---

## CI/CD

Three GitHub Actions workflows in `.github/workflows/`:

| Workflow                    | Trigger              | What it does                                    |
| --------------------------- | -------------------- | ----------------------------------------------- |
| `deploy-production.yml`     | Push to `master`     | Links Supabase prod, runs `db push`             |
| `deploy-dev.yml`            | Push to `dev`        | Links Supabase dev, runs `db push`              |
| `validate-migrations.yml`   | PR to `dev`          | Starts local Supabase, validates migration SQL  |

### Required GitHub Actions secrets

| Secret                       | Description                        |
| ---------------------------- | ---------------------------------- |
| `SUPABASE_ACCESS_TOKEN`      | Supabase CLI access token          |
| `SUPABASE_PROD_PROJECT_REF`  | Production Supabase project ref    |
| `SUPABASE_PROD_DB_PASSWORD`  | Production database password       |
| `SUPABASE_DEV_PROJECT_REF`   | Dev Supabase project ref           |
| `SUPABASE_DEV_DB_PASSWORD`   | Dev database password              |

---

## Branch Strategy

| Branch        | Purpose                         |
| ------------- | ------------------------------- |
| `master`      | Production — auto-deploys       |
| `dev`         | Development integration         |
| `feature/*`   | Feature branches (PR into `dev`)|
| `hotfix/*`    | Production hotfixes             |

**Workflow**: `feature/*` → PR to `dev` → merge → auto-deploy dev. When ready: `dev` → PR to `master` → merge → auto-deploy production.

---

## Useful Commands

```bash
# Development
npm run dev                              # Start dev server on :3000
npm run build                            # Production build
npm run start                            # Serve production build

# Database
npx supabase start                       # Start local Supabase (Docker)
npx supabase stop                        # Stop local Supabase
npx supabase db push                     # Apply all pending migrations
npx supabase db diff --schema public -f <name>  # Generate new migration
npx supabase db reset                    # Reset local DB (re-run all migrations)

# Deployment
vercel --prod                            # Deploy to production
vercel                                   # Deploy preview

# Utility scripts
node scripts/apply-pgvector-migration.mjs       # Apply pgvector extension
node scripts/restore_category_defaults.mjs      # Restore default categories
```

---

## Additional Documentation

| Document                                            | Description                                   |
| --------------------------------------------------- | --------------------------------------------- |
| [`TECHNICAL_OVERVIEW.md`](./TECHNICAL_OVERVIEW.md)  | Deep-dive: architecture, data flow, DB schema |
| [`FEATURE_GUIDE.md`](./FEATURE_GUIDE.md)            | Detailed feature documentation                |
| [`VERCEL_BLOB_SETUP.md`](./VERCEL_BLOB_SETUP.md)    | Vercel Blob configuration for large uploads   |
| [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md) | Invitation system deployment & emails    |
| [`docs/INVITATION_SYSTEM.md`](./docs/INVITATION_SYSTEM.md) | Invitation flow documentation          |
| [`docs/api/`](./docs/api/)                          | Per-module API endpoint documentation         |

---

## Troubleshooting

### "Missing Supabase environment variables"
Ensure `.env.local` exists and contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Restart the dev server after changes.

### Migrations fail on `db push`
Check that your Supabase CLI is linked to the correct project (`npx supabase link --project-ref <ref>`). If a migration references `pgvector`, ensure the extension is enabled: run `scripts/apply-pgvector-migration.mjs`.

### AI features return errors
Verify `OPENAI_API_KEY` is valid and has quota. Check that `QDRANT_URL` and `QDRANT_API_KEY` point to a running cluster with the correct collection.

### Large file uploads fail
Ensure `BLOB_READ_WRITE_TOKEN` is set. The server action body limit is 50MB (configured in `next.config.ts`). For files over that limit, see `VERCEL_BLOB_SETUP.md`.

### Auth redirect loops
Clear browser cookies for `localhost`. If happening in production, verify `SITE_URL` matches your actual domain in both Vercel env vars and Supabase Auth settings.

---

## License

This project is proprietary software developed for Aticon. All rights reserved.
