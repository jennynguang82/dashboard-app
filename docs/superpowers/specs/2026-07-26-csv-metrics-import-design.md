# CSV Metrics Import Design

## Goal

Let Customer Admins append operational metric samples from a CSV file. The dashboard must read the imported rows from the existing database and update its metrics and charts.

## Scope

- Add an import control that only Customer Admins can access.
- Accept CSV files with this exact header row:

  ```text
  recorded_at,uptime,response_time,error_rate,transaction_volume,availability,incidents
  ```

- Validate every row before inserting any data.
- Append validated rows to `public.performance_metrics` for the signed-in admin's organization.
- Reload dashboard data after a successful import.
- Add an RLS insert policy that permits only Customer Admins to add rows for their own organization.

## Import Flow

1. A Customer Admin selects a CSV file from the dashboard.
2. The browser reads the file and validates the header, timestamps, and numeric fields.
3. If any row is invalid, the app shows an error that identifies the first invalid row and writes nothing.
4. If every row is valid, the app adds the signed-in admin's `organization_id` to each row and inserts the batch into `performance_metrics`.
5. The app confirms how many rows it added and reloads the active dashboard range.

## Validation

- `recorded_at` must be a valid date and time.
- `uptime`, `error_rate`, and `availability` must be numbers from 0 through 100.
- `response_time` and `transaction_volume` must be non-negative numbers.
- `incidents` must be a non-negative whole number.
- Blank rows are ignored.
- The importer appends rows exactly as supplied. It does not deduplicate equal timestamps.

## Security

The client uses the existing publishable Supabase key and relies on RLS. The new insert policy checks both conditions:

- The inserted `organization_id` matches the uploader's organization.
- The uploader has the `customer_admin` role.

No service-role credential, storage bucket, server function, or raw CSV archive is added.

## Error Handling

The UI reports an unsupported file type, missing or reordered headers, empty data, invalid fields, and database failures in plain language. An invalid file never creates a partial import.

## Verification

Automated tests cover parsing valid rows and rejecting malformed headers and invalid values. The project test suite and production build must pass after the change.
