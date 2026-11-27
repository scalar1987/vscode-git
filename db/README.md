# Database migrations

`db/migrations/` holds every schema change applied to the Supabase database (project `digigreen-youth-me`), one file per migration, named `<version>_<name>.sql` and in the order they were applied.

The files are exported from the Supabase migration history. They are a record of what was run in production, so do not re-run them against the live database.

## What is not in these files

- **Personal data.** This repository is public. Email addresses in the original migrations (approver scopes, the sign-up allowlist, partner permissions) are replaced with `userN@example.org`. Domain rules such as `'%@gggi.org'` are kept. The real values exist only in the database.
- **One-off data fixes** made outside migrations (for example deleting test rows) and **scheduled jobs** (pg_cron: `notify-approvers`, `weekly-approval-summary`, `weekly-input-digest`).
- **Edge Functions** (`notify-approvers`, `weekly-approval-summary`) and their secrets.
- **Seed data** (`supabase/seed_v1.sql`, kept locally and not committed).

## Adding a change

Apply the change in Supabase as a named migration, then add the same SQL here as `<version>_<name>.sql` in the same pull request as the code that needs it.
