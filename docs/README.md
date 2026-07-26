# Customer Performance Dashboard

This documentation describes a multi-tenant dashboard for application-performance data. Supabase supplies authentication and the PostgreSQL database; Row Level Security (RLS) enforces tenant isolation at the data layer.

## Modules

1. [Platform foundation](01-platform-foundation.md)
2. [Organizations and users](02-organizations-and-users.md)
3. [Authentication and recovery](03-authentication.md)
4. [Roles and tenant access](04-authorization.md)
5. [Performance-data import](05-performance-data-import.md)
6. [Customer dashboard](06-customer-dashboard.md)
7. [Alert thresholds](07-alert-thresholds.md)
8. [Email alerts](08-email-alerts.md)
9. [Platform administration](09-platform-administration.md)
10. [UI page guide](10-ui-page-guide.md)

## Shared role model

| Role | Primary access |
| --- | --- |
| Customer Viewer | Read their organization’s dashboard data. |
| Customer Admin | Viewer access, user invitations for their organization, and its alert thresholds. |
| Support Analyst | Read approved diagnostic data; cannot manage users, imports, or thresholds. |
| Platform Admin | Manage organizations, users, imports, global thresholds, and platform data. |

The browser uses only a Supabase publishable key. Any use of a Supabase secret key, including invitations and bulk imports, stays in a trusted server or Edge Function.
