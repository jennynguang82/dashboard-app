# Phase 1 Supabase Dashboard Design

## Goal

Build the first working Customer Performance Dashboard: secure sign-in and recovery, organization-scoped performance reporting, and customer-admin settings.

## Architecture

Use a single Vite React application with Supabase Auth and PostgreSQL. The browser uses only the publishable key. Supabase Row Level Security restricts every customer-facing query to the signed-in user's organization. No service-role key is included in this phase.

## Data model

`profiles` stores each authenticated user's organization and fixed application role. `organizations` stores customer identity. `performance_metrics` stores the six dashboard metrics with a timestamp. `alert_thresholds` stores organization overrides; a missing override uses the platform default defined in the app for this phase.

## Screens

- Sign in, password recovery, and password reset.
- Customer dashboard with 24-hour, 7-day, and 30-day ranges, six metric cards, charts, freshness, incidents, loading, empty, and retry states.
- Customer Admin user list and alert-threshold settings.

Customer Viewers can view only their organization’s dashboard. Customer Admins can also view customer-admin pages. Platform administration, data imports, and email alerts remain Phase 2 work.

## Data flow and safety

On load, the app reads the Supabase session, then loads the matching profile. Dashboard queries never accept a customer ID from the browser; RLS derives organization access from the profile attached to `auth.uid()`. Each table in `public` has RLS enabled with explicit policies. Forms show generic authentication errors and clear save/query errors.

## Verification

The build must succeed. A seeded customer user must be able to sign in and view only their own organization’s metrics. An unauthenticated query must return no application data. The browser bundle must not contain a service-role key.
