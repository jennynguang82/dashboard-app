# Roles and tenant access

## Purpose

Authorization prevents cross-customer access even if a user manipulates a browser request. Supabase Auth identifies the caller; PostgreSQL RLS uses `auth.uid()` and the caller’s `profiles` row to authorize each row.

## Access rules

| Capability | Customer Viewer | Customer Admin | Support Analyst | Platform Admin |
| --- | --- | --- | --- | --- |
| View own organization metrics | Yes | Yes | Diagnostic scope only | Yes |
| Manage own organization users | No | Yes | No | Yes |
| Import performance files | No | No | No | Yes |
| Edit organization threshold | No | Yes | No | Yes |
| Edit platform threshold | No | No | No | Yes |

## Policy pattern

Metric policies permit a customer user only when the metric’s `organization_id` equals the caller profile’s organization. Platform Admin policies add a separate permitted path. Use `TO authenticated` plus a membership predicate; `TO authenticated` by itself is not authorization. Index columns used by policies, especially `profiles.id`, `profiles.organization_id`, and `performance_metrics.organization_id`.

## User experience flow

1. The user requests a page or action.
2. The UI hides controls that their role cannot use.
3. The database independently evaluates the RLS policy for the request.
4. Allowed rows are returned; denied writes fail safely and the UI reports insufficient permission.

## Important boundary

Do not use editable `user_metadata` for authorization. If JWT claims are later used for roles, use immutable `app_metadata` and refresh sessions after a role change; profile-based RLS avoids stale-claim access.
