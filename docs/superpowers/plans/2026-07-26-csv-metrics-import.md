# CSV Metrics Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Customer Admins append validated CSV metric rows to their organization and refresh the dashboard from the stored data.

**Architecture:** Keep parsing and validation in `lib/dashboard.mjs`, where Node's existing test runner can exercise it without browser tooling. Add one narrow RLS policy to the existing `performance_metrics` table, then let the admin-only React control parse the selected file, attach `profile.organization_id`, insert the prepared rows, and reload the current range.

**Tech Stack:** React 19, Vite 8, Supabase JavaScript 2, PostgreSQL RLS, Node's built-in test runner.

## Global Constraints

- Accept only CSV files with this exact ordered header: `recorded_at,uptime,response_time,error_rate,transaction_volume,availability,incidents`.
- Ignore blank rows; reject a non-blank invalid row before any database insert.
- Append rows without deduplicating equal timestamps.
- Customer Admins may insert rows only for their own organization; Customer Viewers may not import.
- Use no new dependency, storage bucket, server function, service-role key, or raw-file archive.

---

## File Structure

- `lib/dashboard.mjs` — CSV header and row validation, plus a pure function that prepares database-ready metric objects.
- `tests/dashboard.test.mjs` — Node tests for successful parsing and all-or-nothing validation failures.
- The timestamped migration created in Task 2 — RLS insert policy for the existing table.
- `src/main.jsx` — Customer-Admin-only file input, import state, Supabase insert, and dashboard reload.
- `src/style.css` — layout and accessible styling for the import panel.
- `docs/05-performance-data-import.md` — document the implemented customer CSV flow and distinguish it from any future platform-wide importer.

### Task 1: Parse and validate CSV metrics

**Files:**
- Modify: `lib/dashboard.mjs:1-5`
- Modify: `tests/dashboard.test.mjs:1-14`

**Interfaces:**
- Consumes: CSV text and an organization UUID.
- Produces: `parseMetricsCsv(csvText, organizationId) -> Array<{ organization_id: string, recorded_at: string, uptime: number, response_time: number, error_rate: number, transaction_volume: number, availability: number, incidents: number }>`.
- Throws: `Error` whose message identifies an invalid header, an empty file, or the 1-based CSV row that is invalid.

- [ ] **Step 1: Write the failing parser tests**

Add `parseMetricsCsv` to the existing import and append these tests:

```js
test('prepares valid metric rows for one organization', () => {
  const rows = parseMetricsCsv([
    'recorded_at,uptime,response_time,error_rate,transaction_volume,availability,incidents',
    '2026-07-26T09:00:00Z,99.9,240,0.2,1200,99.8,0',
  ].join('\n'), 'ac9d0d0a-0000-4000-8000-000000000001')

  assert.deepEqual(rows, [{
    organization_id: 'ac9d0d0a-0000-4000-8000-000000000001',
    recorded_at: '2026-07-26T09:00:00.000Z',
    uptime: 99.9,
    response_time: 240,
    error_rate: 0.2,
    transaction_volume: 1200,
    availability: 99.8,
    incidents: 0,
  }])
})

test('rejects a reordered header before preparing any rows', () => {
  assert.throws(
    () => parseMetricsCsv('uptime,recorded_at,response_time,error_rate,transaction_volume,availability,incidents\n99,2026-07-26T09:00:00Z,1,1,1,99,0', 'org-1'),
    /header/i,
  )
})

test('rejects an invalid metric with its CSV row number', () => {
  assert.throws(
    () => parseMetricsCsv('recorded_at,uptime,response_time,error_rate,transaction_volume,availability,incidents\n2026-07-26T09:00:00Z,101,1,1,1,99,0', 'org-1'),
    /row 2.*uptime/i,
  )
})
```

- [ ] **Step 2: Run the parser tests and verify they fail**

Run: `node --test tests/dashboard.test.mjs`

Expected: FAIL because `parseMetricsCsv` is not exported.

- [ ] **Step 3: Implement the smallest parser in `lib/dashboard.mjs`**

Export the fixed header list and `parseMetricsCsv`. Normalize a UTF-8 BOM and `\r\n` line endings. Split rows with a small quote-aware loop that accepts escaped double quotes (`""`); then require exactly seven fields. Ignore a row only when every field is empty after trimming.

For each non-blank row, trim fields, parse the timestamp with `new Date`, and reject `NaN` dates. Convert numeric fields with `Number`, reject non-finite values, check percentages in the inclusive `0..100` range, check non-negative values, and require `Number.isInteger(incidents)`. Return normalized numbers and `recorded_at: date.toISOString()` with the supplied `organization_id`.

```js
const headers = ['recorded_at', 'uptime', 'response_time', 'error_rate', 'transaction_volume', 'availability', 'incidents']

function invalid(rowNumber, field) {
  throw new Error(`CSV row ${rowNumber} has an invalid ${field}.`)
}
```

- [ ] **Step 4: Run the test suite and verify it passes**

Run: `npm test`

Expected: all existing range tests and the three parser tests pass.

- [ ] **Step 5: Commit the parser**

```bash
git add lib/dashboard.mjs tests/dashboard.test.mjs
git commit -m "feat: validate CSV metric rows"
```

### Task 2: Permit only Customer Admin metric inserts

**Files:**
- Create: the timestamped SQL migration produced by Step 1 in `supabase/migrations/`
- Modify: `docs/SUPABASE_SETUP.md:1-15`

**Interfaces:**
- Consumes: an authenticated Supabase session and rows supplied by Task 1.
- Produces: an RLS policy named `customer admins create organization metrics` on `public.performance_metrics`.
- Denies: any row whose organization differs from `private.current_organization_id()` and every non-admin role.

- [ ] **Step 1: Create the migration through the Supabase CLI**

Run:

```bash
npx supabase migration new allow_customer_admin_metric_imports
```

Expected: a timestamped empty SQL file appears in `supabase/migrations/`.

- [ ] **Step 2: Add the authorization policy to the migration**

Place this policy in the generated migration file:

```sql
create policy "customer admins create organization metrics"
on public.performance_metrics
for insert
to authenticated
with check (
  organization_id = private.current_organization_id()
  and private.current_role() = 'customer_admin'
);
```

The policy is intentionally only `INSERT`: imported data remains append-only from the browser.

- [ ] **Step 3: Apply the migration to the connected Supabase project and verify RLS**

Apply the generated migration using the project’s established Supabase workflow. In the SQL editor, test as an authenticated Customer Admin with an organization-owned row; then test an insert using a different organization ID and as a Customer Viewer. The first insert must succeed, and both unauthorized attempts must fail.

- [ ] **Step 4: Update setup instructions**

Add a short `Apply later migrations` note to `docs/SUPABASE_SETUP.md` that tells operators to run every migration in order, including the new policy, before testing CSV import.

- [ ] **Step 5: Commit the database policy**

```bash
git add supabase/migrations docs/SUPABASE_SETUP.md
git commit -m "feat: authorize customer metric imports"
```

### Task 3: Add the admin-only import control

**Files:**
- Modify: `src/main.jsx:1-92`
- Modify: `src/style.css:1-6`

**Interfaces:**
- Consumes: `profile.organization_id`, the exported `parseMetricsCsv`, and a selected `File`.
- Produces: a Customer-Admin-only `MetricsImport` component that calls `onImported()` after a successful insert.
- Calls: `supabase.from('performance_metrics').insert(rows)` exactly once after the entire CSV is parsed successfully.

- [ ] **Step 1: Add a failing pure import-preparation test**

Add this test beside the Task 1 tests so a blank input cannot be passed through to Supabase:

```js
test('rejects a CSV that contains no metric rows', () => {
  assert.throws(
    () => parseMetricsCsv('recorded_at,uptime,response_time,error_rate,transaction_volume,availability,incidents\n\n', 'org-1'),
    /no metric rows/i,
  )
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/dashboard.test.mjs`

Expected: FAIL because the parser currently accepts an empty result.

- [ ] **Step 3: Make the parser reject empty imports**

After parsing, throw `new Error('The CSV contains no metric rows.')` when no normalized rows were produced. Do not alter valid-row behavior.

- [ ] **Step 4: Implement `MetricsImport` and connect it to the dashboard**

Import `parseMetricsCsv` in `src/main.jsx`. Add a small `MetricsImport({ organizationId, onImported })` component with local `message` and `busy` state. Its file input must use `accept=".csv,text/csv"`, be disabled while importing, and have a visible label. On change:

```js
const text = await event.target.files[0].text()
const rows = parseMetricsCsv(text, organizationId)
const { error } = await supabase.from('performance_metrics').insert(rows)
if (error) throw error
onImported()
```

Catch errors and show their message; after a success, show `Imported N metric row(s).` and clear the file input value. Render the component in `DashboardView` only when `admin` is true, passing `loadDashboard` as `onImported`. Keep it above the loading and empty states so admins can seed an empty dashboard.

Add focused CSS for a compact `.import-panel` that matches the existing `.panel` border, supports a wrapping file control on small screens, and preserves visible keyboard focus through the existing global input focus rule.

- [ ] **Step 5: Run the complete local checks**

Run:

```bash
npm test
npm run build
```

Expected: both commands exit with status `0`.

- [ ] **Step 6: Manually verify the signed-in workflow**

As a Customer Admin, import a one-row CSV inside the active range and confirm the row count, metric cards, and chart refresh. As a Customer Viewer, confirm the import panel is absent. Import a row with `uptime` set to `101` and confirm the UI shows the row error and the database row count does not change.

- [ ] **Step 7: Commit the UI**

```bash
git add src/main.jsx src/style.css lib/dashboard.mjs tests/dashboard.test.mjs
git commit -m "feat: import dashboard metrics from CSV"
```

### Task 4: Align the import documentation

**Files:**
- Modify: `docs/05-performance-data-import.md:1-24`

**Interfaces:**
- Consumes: the CSV headers and access rules in the approved design.
- Produces: documentation that accurately describes the shipped Customer Admin CSV flow.

- [ ] **Step 1: Replace the current platform-wide importer description**

Document the implemented CSV-only Customer Admin feature: exact header order, append behavior, all-or-nothing validation, and organization-scoped RLS. State that XLSX support, raw-file retention, import metadata, alert evaluation, and cross-customer Platform Admin imports are not part of this feature.

- [ ] **Step 2: Verify the document matches the implementation**

Compare its header string and permission statement against `lib/dashboard.mjs`, `src/main.jsx`, and the generated policy. The text must name the same seven headers and Customer Admin role.

- [ ] **Step 3: Commit the documentation**

```bash
git add docs/05-performance-data-import.md
git commit -m "docs: describe customer CSV metric import"
```

## Final Verification

- [ ] Run `git diff --check 4cab9ac..HEAD` and confirm no whitespace errors.
- [ ] Run `npm test` and `npm run build`; both must exit `0`.
- [ ] Confirm the remote Supabase project has the generated migration applied and that the RLS checks from Task 2 passed.
- [ ] Confirm every approved requirement: CSV-only, exact headers, whole-file validation, append behavior, organization scoping, Customer-Admin-only import, error feedback, and dashboard refresh.
