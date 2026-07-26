# Customer dashboard

## Purpose

Show the current health of one customer’s applications using uptime, response time, error rate, transaction volume, availability, and incidents. The dashboard supports fixed 24-hour, 7-day, and 30-day ranges.

## Data behavior

The page queries `performance_metrics` for the selected time window. RLS supplies organization scoping, so the client never passes a customer ID for standard customer views. Return summary values, time-series points, and incident totals from an RLS-safe query or `security_invoker` view.

## User experience flow

1. A signed-in customer lands on the dashboard with the 24-hour range selected.
2. The page shows loading placeholders, then metric summaries and charts.
3. The user selects 7 days or 30 days; the page reloads only that time range.
4. Empty ranges explain that no performance data is available yet.
5. The user can see only their organization’s data, regardless of modified URL parameters or browser requests.

## Quality checks

- Reject unsupported ranges rather than guessing.
- Label units clearly: percentages, milliseconds, counts, and volumes.
- Show data freshness using the latest `recorded_at` timestamp.
