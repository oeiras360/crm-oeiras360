# CRM Oeiras360

A focused CRM MVP built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

## Features

- Lead pipeline with five practical statuses
- Reusable email and LinkedIn contact templates
- Static sales battlesheet, ready for database-backed editing
- Responsive Notion-inspired navigation
- Lazy Supabase clients for browser, server, and trusted admin operations

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Create a Supabase project and fill in `.env.local`.

4. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.

5. Start the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/pipeline`.

## Routes

- `/crm` — sales overview and shortcuts
- `/pipeline` — leads and next actions
- `/templates` — email and LinkedIn outreach templates
- `/battlesheet` — internal sales playbook

## Project structure

```text
app/                  App Router routes and global layout
components/           Reusable CRM UI
content/              Static MVP content
lib/supabase/         Lazy browser and server clients
supabase/schema.sql   Initial PostgreSQL schema
types/crm.ts          CRM domain types
```

## Supabase notes

The public URL and anonymous key are safe to use in browser code when Row Level Security policies are configured. The initial schema enables RLS but deliberately defines no policies until the authentication and ownership model is decided.

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is only read in `lib/supabase/server.ts`, which is protected by `server-only`. Never import that module into a Client Component or rename the variable with a `NEXT_PUBLIC_` prefix.

Leads live in the first-class `public.leads` table (English snake_case columns, timestamps, activity log in `public.lead_activities`). `leads_import` is now a compatibility **view** over `leads` with the original Portuguese column names so external n8n workflows keep working unchanged. Its INSTEAD OF INSERT trigger dedups by `identity_key`, so writers must use plain inserts (PostgREST upsert / `ON CONFLICT` does not work on views).

`tools/sync_notion_csv_to_supabase.py` is retired: it did a delete-all + reinsert, which now fails by design on won leads (the `client_deals.lead_id` foreign key restricts deletion). The CRM is the source of truth for leads. The pre-migration table is kept as `leads_import_backup` for rollback and can be dropped after a couple of weeks of clean n8n runs.

Contact templates are Markdown files in the private `contact-templates` Storage bucket. They use YAML-style frontmatter (`title`, `channel`, `category`, `status`, and optional `subject`) followed by the message body. The server reads the bucket with the service-role client; the key is never sent to the browser.

The Sales Battlesheet is rendered from `lead-battlesheet-oeiras360.md` in the private `battlesheet` Storage bucket. GitHub-flavored Markdown headings, lists, links, quotes, code, and tables are supported.

## Notion lead migration

The full Notion export is the CSV whose name ends in `_all.csv` (363 rows). The other CSV is a filtered view containing only the 249 leads in `Contacted`.

| Notion property | Supabase column | Type / note |
| --- | --- | --- |
| Empresa | `company_name` | `text`, required |
| Nome | `contact_name` | `text`, required |
| Cargo | `job_title` | `text`; present but empty in the export |
| E-mail | `email` | `text` |
| Telefone | `phone` | `text` to preserve formatting and multiple numbers |
| Site | `website` | `text` |
| LinkedIn | `linkedin_url` | `text` |
| Fonte | `source` | `text` |
| Funil | `funnel_stage` | constrained `text`; authoritative sales pipeline |
| ICP | `icp` | `text` |
| Local | `location` | `text` |
| Notas | `notes` | `text` |
| Pontuação do lead | `lead_score` | `numeric`; exported values mix decimals and integers |
| Tags | `tags` | `text[]`; Notion multi-select |
| Último contato | `last_contacted_at` | `date` |
| Canal | `preferred_channel` | `Email`, `Telefone`, or null |

The real funnel stages are `Lead`, `Contacted`, `Engaged`, `Negotiation`, `Closed - Won`, `Closed - On Hold`, and `Closed - Lost`. `Tags` includes secondary labels such as `Novo lead`, `Alta prioridade`, and `Acompanhamento`; it is not treated as another pipeline.

The export does not include a next-follow-up date or Notion creation/update timestamps. Supabase generates `created_at` and `updated_at`, while the UI derives a suggested next action from the funnel stage and last-contact date.
