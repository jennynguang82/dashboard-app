# Performance-data import

## Purpose

Customer Admins can append performance metrics for their own organization from a CSV file. The dashboard reads the stored rows after import and refreshes the selected range.

## Required columns

The CSV header must use this exact order:

`recorded_at`, `uptime`, `response_time`, `error_rate`, `transaction_volume`, `availability`, `incidents`

## Import flow

1. A Customer Admin selects a CSV file from the performance dashboard.
2. The browser validates the full file before it inserts any rows.
3. Blank rows are ignored. An invalid header, timestamp, or metric value stops the import and identifies the invalid row.
4. Valid rows append to `performance_metrics` with the signed-in admin's organization ID.
5. The dashboard reloads and reports the imported row count.

## Access and limits

- RLS permits inserts only when the user is a Customer Admin and the row belongs to that user's organization.
- Equal timestamps are allowed because imports append rows rather than replace or deduplicate them.
- XLSX support, raw-file retention, import metadata, alert evaluation, and cross-customer Platform Admin imports are outside this feature.
