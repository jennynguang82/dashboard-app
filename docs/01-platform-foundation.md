# Platform foundation

## Purpose

Establish the React dashboard and the Supabase project that backs every module. Supabase replaces the planned custom Node authentication service and standalone PostgreSQL connection.

## Supabase responsibilities

- **Auth:** email/password sign-in, invite emails, sessions, and password recovery.
- **Database:** PostgreSQL tables, indexes, migrations, and RLS policies.
- **Edge Functions or a trusted server:** work that needs a secret key, such as inviting users and processing imports.

Create application tables in `public`, enable RLS on every exposed table, and keep privileged functions outside an exposed schema. The initial schema contains organizations, profiles, performance metrics, imports, thresholds, and alert deliveries. `profiles.id` references `auth.users.id` with `on delete cascade`.

## User experience flow

1. A user opens the dashboard URL.
2. The app checks the current Supabase session.
3. With no session, the user sees Sign in; with a session, the app loads the profile and opens the permitted home page.
4. Every data request carries the session token. RLS returns only rows the user may access.

## Success criteria

- An unauthenticated visitor cannot read application data.
- Every user-visible table has RLS enabled and an explicit policy.
- No browser bundle contains a secret or service-role key.
