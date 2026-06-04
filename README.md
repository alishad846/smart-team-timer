# SmartTeamTimer

Modern SaaS starter for intern and employee productivity tracking, time logging, activity monitoring, and manager analytics.

## Stack

- Next.js 15
- TypeScript
- TailwindCSS
- Supabase Auth
- Prisma ORM
- Zustand
- Recharts
- Electron desktop tracker

## MVP Structure

- `app/` - Next.js App Router pages, layouts, and API routes
- `components/` - shared UI, dashboard, auth, and chart components
- `lib/` - auth helpers, Prisma client, validation schemas, analytics helpers, and Supabase clients
- `prisma/` - database schema
- `electron/` - desktop tracker scaffold, config UI, and telemetry pipeline

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `TRACKER_API_URL`
- `FIRST_ADMIN_EMAIL`
- `FIRST_ADMIN_PASSWORD`
- `FIRST_ADMIN_FULL_NAME`

## Bootstrap Admin

To create or reset the first admin account locally:

```bash
npm run bootstrap:admin
```

Set `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD`, and `FIRST_ADMIN_FULL_NAME` in your local env before running the command.
The first workspace owner is treated as admin, so the account will land on `/admin` after sign-in.

## Node Version

This project targets Node.js 20 or newer. The current Supabase packages in use require Node 20+, so older runtimes such as Node 18 will show `EBADENGINE` warnings during install and may fail later in development or CI.

## MVP Flow

1. User registers or logs in through Supabase.
2. Middleware protects dashboard routes.
3. Dashboard pages render manager analytics and productivity insights.
4. Electron tracker collects activity every 30 seconds and uploads to `/api/activity`.
5. Optional screenshots are uploaded to `/api/screenshots`.
6. AI summaries are generated through `/api/summaries`.

## Notes

- The desktop tracker uses optional native dependencies for app focus, input hooks, and screenshots.
- The schema is ready for organization, team, project, task, time entry, activity log, screenshot, app usage, website usage, and daily summary records.
- The UI is designed to work in both light and dark mode.
