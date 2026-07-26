# Alert thresholds

## Purpose

Thresholds define when imported performance data requires an email alert. An organization-level threshold set by a Customer Admin overrides the platform-wide threshold for that metric.

## Data model and precedence

`alert_thresholds` stores `organization_id` (null for platform-wide), `metric`, `operator`, and `value`. A unique constraint allows one active rule per organization/metric and one global rule per metric.

Resolution is simple: use the organization rule when it exists; otherwise use the global rule. The supported metric list matches the dashboard metrics.

## User experience flow

1. A Customer Admin opens **Alert thresholds**.
2. The page displays the active value for each metric and identifies whether it is organization-specific or inherited.
3. The admin edits an organization rule and saves it.
4. The next import uses the new value; historical emails are unchanged.
5. A Platform Admin manages global defaults with the same interface, but Customers cannot edit them.

## Access rules

RLS lets Customer Admins read and update only thresholds for their own organization. Platform Admins can manage global thresholds and customer overrides. Customer Viewers and Support Analysts have no threshold-edit permission.
