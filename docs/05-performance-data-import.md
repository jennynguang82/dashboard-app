# Performance-data import

## Purpose

Platform Admins upload a CSV or XLSX file containing rows for one or more customers. The importer validates the full file before storing any metric rows, so a bad customer ID cannot create a partial import.

## Required row fields

`customer_id`, `recorded_at`, `uptime`, `response_time`, `error_rate`, `transaction_volume`, `availability`, and `incidents`.

Store import metadata in `performance_imports` and normalized rows in `performance_metrics`. Index metrics by `(organization_id, recorded_at desc)`.

## User experience flow

1. A Platform Admin opens **Performance data** and chooses a CSV or XLSX file.
2. The upload screen checks the format and displays the required column names.
3. A trusted import endpoint or Edge Function verifies the user, parses the file, validates each value and customer ID, and wraps storage in one transaction.
4. The screen shows imported-row count and a clear row-level error summary if validation fails.
5. After commit, the system evaluates alerts for the new records.

## Rules

- Customer-facing users never receive import permission.
- Do not let client code write raw metric rows with a secret key.
- Keep the original file only when audit or reprocessing requires it; otherwise store metadata and validation results to limit retention.
