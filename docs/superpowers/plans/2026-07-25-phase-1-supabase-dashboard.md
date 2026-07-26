# Phase 1 Supabase Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite React customer performance dashboard backed by Supabase Auth and RLS-protected PostgreSQL data.

**Architecture:** A single Vite React application creates one browser Supabase client from publishable environment values. SQL in `supabase/migrations` creates the tenant data model, enables RLS, and uses the signed-in profile to scope every browser data query.

**Tech Stack:** Vite, React, JavaScript, `@supabase/supabase-js`, Supabase Auth, PostgreSQL, SQL migrations.

## Global Constraints

- The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Every table in `public` has RLS enabled with explicit policies.
- Customer dashboard queries never receive an organization ID from browser input.
- Customer Viewers can view their organization’s dashboard; Customer Admins can also manage thresholds and view organization users.
- Platform administration, performance-data imports, and email alerts are not part of this phase.

---

## File Structure

- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/style.css` — Vite React application shell and screen routing.
- Create: `src/supabase.js` — singleton browser client.
- Create: `lib/dashboard.mjs` — range validation for dashboard queries.
- Create: `supabase/migrations/202607250001_phase_1_dashboard.sql` — schema, RLS policies, and seed data.
- Create: `tests/dashboard.test.mjs` — range validation tests.

### Task 1: Create the application shell and Supabase client

**Files:**
- Create: `package.json`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `src/supabase.js`

**Interfaces:**
- Produces: `supabase`, a browser client from the two public environment values.
- Produces: `/`, which renders sign-in when no session exists and the dashboard shell when a session exists.

- [x] **Step 1: Write the client initialization check**

```js
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

assert.throws(() => createClient('', ''), /supabaseUrl is required/)
```

- [x] **Step 2: Run the check before implementation**

Run: `node --test tests/dashboard.test.mjs`

Expected: FAIL because the project and test file do not exist.

- [x] **Step 3: Create the minimal client module**

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
```

- [x] **Step 4: Add the session gate and sign-in form**

```tsx
const { error } = await supabase.auth.signInWithPassword({ email, password })
if (error) setMessage('Unable to sign in with those details.')
```

- [x] **Step 5: Build the application**

Run: `npm run build`

Expected: PASS with a production build.

### Task 2: Define the tenant schema and RLS rules

**Files:**
- Create: `supabase/migrations/202607250001_phase_1_dashboard.sql`

**Interfaces:**
- Produces: `organizations`, `profiles`, `performance_metrics`, and `alert_thresholds`.
- Produces: RLS-scoped table queries for dashboard rows.

- [x] **Step 1: Write the policy acceptance query**

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('organizations', 'profiles', 'performance_metrics', 'alert_thresholds');
```

- [x] **Step 2: Run it before applying the schema**

Run in the Supabase SQL Editor.

Expected: no matching application tables before the migration runs.

- [x] **Step 3: Create tables, indexes, RLS, and policies**

```sql
create policy "users read their organization metrics"
on public.performance_metrics for select to authenticated
using (organization_id = (select organization_id from public.profiles where id = (select auth.uid())));
```

- [ ] **Step 4: Apply the migration in the Supabase SQL Editor**

Run: copy the complete SQL migration into the project SQL Editor and select Run.

Expected: all four application tables are created and RLS is enabled.

- [ ] **Step 5: Re-run the policy acceptance query**

Expected: four rows, each with `rowsecurity = true`.

### Task 3: Add dashboard data loading and customer-admin settings

**Files:**
- Create: `lib/dashboard.mjs`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `tests/dashboard.test.mjs`

**Interfaces:**
- Produces: `rangeStart(range: '24h' | '7d' | '30d', now: Date): string`.
- Consumes: RLS-scoped `performance_metrics`, `profiles`, and `alert_thresholds` rows.

- [x] **Step 1: Write the failing range test**

```js
import assert from 'node:assert/strict'
import { rangeStart } from '../lib/dashboard.mjs'

assert.equal(rangeStart('24h', new Date('2026-07-25T12:00:00Z')), '2026-07-24T12:00:00.000Z')
assert.equal(rangeStart('7d', new Date('2026-07-25T12:00:00Z')), '2026-07-18T12:00:00.000Z')
assert.throws(() => rangeStart('all', new Date()), /Unsupported range/)
```

- [x] **Step 2: Run the test before implementation**

Run: `node --test tests/dashboard.test.mjs`

Expected: FAIL because `lib/dashboard.mjs` does not exist.

- [x] **Step 3: Implement the validated range helper**

```js
export function rangeStart(range, now) {
  const hours = { '24h': 24, '7d': 168, '30d': 720 }[range]
  if (!hours) throw new Error('Unsupported range')
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
}
```

- [x] **Step 4: Query dashboard rows through the signed-in client**

```ts
const { data, error } = await supabase
  .from('performance_metrics')
  .select('*')
  .gte('recorded_at', rangeStart(selectedRange, new Date()))
  .order('recorded_at', { ascending: true })
```

- [x] **Step 5: Render the approved customer dashboard, Users, and Alert thresholds views**

```tsx
{profile.role === 'customer_admin' && (
  <button onClick={() => setView('thresholds')}>Alert thresholds</button>
)}
```

- [x] **Step 6: Run focused and production verification**

Run: `node --test tests/dashboard.test.mjs && npm run build`

Expected: all tests pass and the production build completes.
