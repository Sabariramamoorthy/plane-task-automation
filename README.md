# Plane Task Automation

Convert natural-language task statements into structured Plane issues using Groq.

## Stack

- Next.js 16, TypeScript, shadcn-style UI
- PostgreSQL + Drizzle ORM
- Better Auth (email/password)
- Groq structured output
- Plane REST API

## Setup

1. Copy environment file:

```bash
cp .env.example .env.local
```

2. Set `DATABASE_URL` in `.env.local` (Neon or local Postgres). **Never** use a `NEXT_PUBLIC_` prefix for database credentials.

3. Push database schema:

```bash
npm run db:push
```

4. Set `GROQ_API_KEY` in `.env.local`.

5. Run the app:

```bash
npm run dev
```

6. Register a user, add a Plane instance in **Instances**, then use the **Wizard**.

## Instance settings

Each Plane instance stores:

- Base URL (`PLANE_BASE_URL`)
- API Key (`PLANE_API_KEY`)
- Workspace Slug (`PLANE_WORKSPACE_SLUG`)
- Project ID (`PLANE_PROJECT_ID`)
- Default Module ID (`PLANE_DEFAULT_MODULE_ID`)

## Workflow

1. Select Plane instance
2. Paste task statement
3. Groq generates structured tasks
4. Review, assign module/assignee, create in Plane
