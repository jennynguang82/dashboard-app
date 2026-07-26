# Customer Performance Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-customer application-performance dashboard with secure access, predefined permissions, performance-data uploads, and email alerts.

**Architecture:** A React single-page application calls a Node.js REST API. The API authenticates users, scopes customer-facing requests to the signed-in user's organization, persists data in PostgreSQL, and sends alert emails when imported performance data exceeds the active customer threshold.

**Tech Stack:** React, Node.js, PostgreSQL.

## Global Constraints

- External customers can view only the performance data belonging to their own organization.
- A customer organization can have multiple user accounts.
- Predefined roles are Customer Admin, Customer Viewer, Support Analyst, and Platform Admin.
- Platform Admins and Customer Admins can create users; no public registration.
- Password-reset emails are supported.
- Dashboard metrics are uptime, response time, error rate, transaction volume, availability, and incidents.
- Dashboard ranges are 24 hours, 7 days, and 30 days.
- Platform Admins upload CSV and XLSX files; each row identifies the customer through a customer-ID column; an upload can contain multiple customers.
- Platform Admins manage customer organizations, user accounts, performance data, roles/permissions, and system-wide alert thresholds.
- Customer Admin thresholds override Platform Admin thresholds.
- Alerts are email-only and go to Customer Admins.
- Customer settings have no scope beyond managing their alert thresholds.

---

## File Structure

- `client/`: React dashboard, sign-in/reset screens, customer-admin views, and platform-admin views.
- `server/`: Node.js API, authorization middleware, import parser, alert evaluation, and email delivery.
- `database/`: PostgreSQL schema and migrations for organizations, users, roles, metrics, imports, thresholds, and alert deliveries.
- `server/tests/`: API, authorization, importer, and alert-rule tests.
- `client/src/**/*.test.*`: UI access and dashboard-range tests.

### Task 1: Establish the application skeleton and database connection

**Files:**
- Create: `client/`
- Create: `server/`
- Create: `database/migrations/001_initial.sql`
- Create: `server/tests/health.test.js`

**Interfaces:**
- Produces: `GET /api/health -> { status: "ok" }`.
- Produces: a database migration runner used by all later API tasks.

- [ ] **Step 1: Write the failing health-endpoint test**

```js
it('returns an OK health status', async () => {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- server/tests/health.test.js`
Expected: FAIL because the server application does not exist.

- [ ] **Step 3: Implement the smallest API and React application startup path**

```js
app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});
```

- [ ] **Step 4: Create the initial PostgreSQL migration**

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  customer_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 5: Run the health test and migration**

Run: `npm test -- server/tests/health.test.js`
Expected: PASS.

Run: `npm run migrate --prefix server`
Expected: the `organizations` table is created.

- [ ] **Step 6: Commit**

```bash
git add client server database
git commit -m "chore: initialize performance dashboard"
```

### Task 2: Add organizations, predefined roles, and user accounts

**Files:**
- Modify: `database/migrations/001_initial.sql`
- Create: `server/routes/admin-organizations.js`
- Create: `server/routes/users.js`
- Create: `server/tests/admin-organizations.test.js`

**Interfaces:**
- Produces: `POST /api/admin/organizations` for Platform Admins.
- Produces: `POST /api/users` for Platform Admins and Customer Admins.
- Produces: roles `customer_admin`, `customer_viewer`, `support_analyst`, and `platform_admin`.

- [ ] **Step 1: Write failing tests for organization and user creation**

```js
it('allows a platform admin to create an organization', async () => {
  const response = await asPlatformAdmin()
    .post('/api/admin/organizations')
    .send({ customerId: 'CUST-001', name: 'Acme' });
  expect(response.status).toBe(201);
});

it('prevents a customer admin from creating a user in another organization', async () => {
  const response = await asCustomerAdmin('CUST-001')
    .post('/api/users')
    .send({ organizationId: 'CUST-002', email: 'new@example.com', role: 'customer_viewer' });
  expect(response.status).toBe(403);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- server/tests/admin-organizations.test.js`
Expected: FAIL because the routes and tables do not exist.

- [ ] **Step 3: Add schema and seed the fixed role set**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer_admin', 'customer_viewer', 'support_analyst', 'platform_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 4: Implement organization-scoped user creation**

```js
const mayCreateUser = (actor, organizationId) =>
  actor.role === 'platform_admin' ||
  (actor.role === 'customer_admin' && actor.organizationId === organizationId);
```

- [ ] **Step 5: Run the focused tests**

Run: `npm test -- server/tests/admin-organizations.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add database server
git commit -m "feat: add organizations and user roles"
```

### Task 3: Implement authentication and password resets

**Files:**
- Create: `server/routes/auth.js`
- Create: `server/services/password-reset.js`
- Create: `server/tests/auth.test.js`
- Create: `client/src/pages/LoginPage.jsx`
- Create: `client/src/pages/ForgotPasswordPage.jsx`
- Create: `client/src/pages/ResetPasswordPage.jsx`

**Interfaces:**
- Produces: `POST /api/auth/login`, `POST /api/auth/password-reset`, and `POST /api/auth/password-reset/confirm`.
- Consumes: the user records from Task 2.
- Produces: an authenticated API identity carrying `id`, `organizationId`, and `role`.

- [ ] **Step 1: Write failing authentication and reset-flow tests**

```js
it('issues an authenticated session for valid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@acme.test', password: 'correct-password' });
  expect(response.status).toBe(200);
  expect(response.body.user.role).toBe('customer_admin');
});

it('sends a password-reset email for a known user', async () => {
  const response = await request(app)
    .post('/api/auth/password-reset')
    .send({ email: 'admin@acme.test' });
  expect(response.status).toBe(202);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- server/tests/auth.test.js`
Expected: FAIL because authentication routes do not exist.

- [ ] **Step 3: Implement secure credential verification and single-use reset tokens**

```js
const resetToken = crypto.randomUUID();
await saveResetToken({ userId, tokenHash: hash(resetToken), expiresAt: addHours(new Date(), 1) });
await emailPasswordReset(user.email, resetToken);
```

- [ ] **Step 4: Add the login and reset screens**

```jsx
<form onSubmit={submitLogin}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Sign in</button>
</form>
```

- [ ] **Step 5: Run the focused tests**

Run: `npm test -- server/tests/auth.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client server database
git commit -m "feat: add customer authentication"
```

### Task 4: Enforce role and organization access controls

**Files:**
- Create: `server/middleware/authorize.js`
- Create: `server/tests/authorization.test.js`
- Modify: `server/routes/admin-organizations.js`
- Modify: `server/routes/users.js`

**Interfaces:**
- Produces: `requireRole(...roles)` and `requireOrganizationAccess(organizationId)` middleware.
- Consumes: authenticated identity from Task 3.

- [ ] **Step 1: Write failing access-control tests**

```js
it('does not expose another organization’s records to a customer viewer', async () => {
  const response = await asCustomerViewer('CUST-001').get('/api/organizations/CUST-002/metrics');
  expect(response.status).toBe(403);
});

it('allows a support analyst to view diagnostics but not create users', async () => {
  expect((await asSupportAnalyst().get('/api/diagnostics')).status).toBe(200);
  expect((await asSupportAnalyst().post('/api/users').send({})).status).toBe(403);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- server/tests/authorization.test.js`
Expected: FAIL because no authorization middleware exists.

- [ ] **Step 3: Implement centralized authorization rules**

```js
export const requireRole = (...roles) => (request, response, next) => {
  if (!roles.includes(request.user.role)) return response.sendStatus(403);
  next();
};
```

- [ ] **Step 4: Apply middleware to every protected route and run tests**

Run: `npm test -- server/tests/authorization.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat: enforce role and organization access"
```

### Task 5: Import and validate multi-customer CSV and XLSX performance data

**Files:**
- Create: `database/migrations/002_performance_data.sql`
- Create: `server/routes/imports.js`
- Create: `server/services/performance-import.js`
- Create: `server/tests/performance-import.test.js`
- Create: `client/src/pages/AdminImportPage.jsx`

**Interfaces:**
- Produces: `POST /api/admin/performance-imports` for Platform Admins.
- Produces: metric records `{ organizationId, recordedAt, uptime, responseTime, errorRate, transactionVolume, availability, incidents }`.
- Consumes: CSV or XLSX file rows with a `customer_id` column.

- [ ] **Step 1: Write failing importer tests**

```js
it('stores rows for each customer ID in a multi-customer CSV', async () => {
  const result = await importPerformanceFile(csv([
    ['customer_id', 'recorded_at', 'uptime', 'response_time', 'error_rate', 'transaction_volume', 'availability', 'incidents'],
    ['CUST-001', '2026-07-25T00:00:00Z', '99.9', '120', '0.1', '34', '99.9', '0'],
    ['CUST-002', '2026-07-25T00:00:00Z', '98.0', '400', '1.2', '11', '98.0', '3']
  ]));
  expect(result.importedRows).toBe(2);
});

it('rejects a row with an unknown customer ID', async () => {
  await expect(importPerformanceFile(csvWithCustomer('UNKNOWN'))).rejects.toThrow('Unknown customer ID');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- server/tests/performance-import.test.js`
Expected: FAIL because importing is not implemented.

- [ ] **Step 3: Add imported-file and metric tables**

```sql
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  recorded_at TIMESTAMPTZ NOT NULL,
  uptime NUMERIC NOT NULL,
  response_time NUMERIC NOT NULL,
  error_rate NUMERIC NOT NULL,
  transaction_volume NUMERIC NOT NULL,
  availability NUMERIC NOT NULL,
  incidents INTEGER NOT NULL
);
CREATE INDEX performance_metrics_org_time ON performance_metrics (organization_id, recorded_at DESC);
```

- [ ] **Step 4: Implement Platform-Admin-only parsing, row validation, and transactional storage**

```js
if (!headers.includes('customer_id')) throw new Error('Missing customer_id column');
for (const row of rows) {
  const organization = await findOrganizationByCustomerId(row.customer_id);
  if (!organization) throw new Error(`Unknown customer ID: ${row.customer_id}`);
}
```

- [ ] **Step 5: Add a file-upload page for Platform Admins and run importer tests**

Run: `npm test -- server/tests/performance-import.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client server database
git commit -m "feat: import multi-customer performance data"
```

### Task 6: Expose scoped dashboard data for 24-hour, 7-day, and 30-day ranges

**Files:**
- Create: `server/routes/metrics.js`
- Create: `server/tests/metrics.test.js`
- Create: `client/src/pages/DashboardPage.jsx`
- Create: `client/src/components/RangeSelector.jsx`

**Interfaces:**
- Produces: `GET /api/metrics?range=24h|7d|30d`.
- Produces: dashboard data for uptime, response time, error rate, transaction volume, availability, and incidents.
- Consumes: metric records from Task 5 and organization scoping from Task 4.

- [ ] **Step 1: Write failing dashboard API tests**

```js
it('returns only the signed-in customer organization metrics for seven days', async () => {
  const response = await asCustomerViewer('CUST-001').get('/api/metrics?range=7d');
  expect(response.status).toBe(200);
  expect(response.body.range).toBe('7d');
  expect(response.body.metrics.every((metric) => metric.organizationId === orgId('CUST-001'))).toBe(true);
});

it('rejects an unsupported date range', async () => {
  expect((await asCustomerViewer('CUST-001').get('/api/metrics?range=90d')).status).toBe(400);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- server/tests/metrics.test.js`
Expected: FAIL because the metrics endpoint does not exist.

- [ ] **Step 3: Implement fixed-range validation and organization-scoped queries**

```js
const ranges = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };
const hours = ranges[request.query.range];
if (!hours) return response.status(400).json({ error: 'range must be 24h, 7d, or 30d' });
```

- [ ] **Step 4: Render metric summaries and the three range controls in React**

```jsx
<RangeSelector value={range} onChange={setRange} options={['24h', '7d', '30d']} />
<MetricSummary metrics={metrics} />
```

- [ ] **Step 5: Run API and UI tests**

Run: `npm test -- server/tests/metrics.test.js`
Expected: PASS.

Run: `npm test --prefix client`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client server
git commit -m "feat: show customer performance dashboard"
```

### Task 7: Add threshold precedence and Customer Admin threshold management

**Files:**
- Create: `database/migrations/003_alert_thresholds.sql`
- Create: `server/routes/thresholds.js`
- Create: `server/services/threshold-resolution.js`
- Create: `server/tests/thresholds.test.js`
- Create: `client/src/pages/ThresholdSettingsPage.jsx`

**Interfaces:**
- Produces: `GET /api/thresholds` and `PUT /api/thresholds/:metric`.
- Produces: `resolveThreshold({ organizationId, metric }) -> threshold`.
- Rule: an organization-level Customer Admin threshold takes precedence over a platform-wide threshold.

- [ ] **Step 1: Write failing threshold-precedence tests**

```js
it('uses a customer threshold instead of the platform threshold', async () => {
  await setPlatformThreshold('error_rate', 2);
  await setCustomerThreshold(orgId('CUST-001'), 'error_rate', 1);
  await expect(resolveThreshold({ organizationId: orgId('CUST-001'), metric: 'error_rate' })).resolves.toBe(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- server/tests/thresholds.test.js`
Expected: FAIL because threshold storage and resolution do not exist.

- [ ] **Step 3: Create threshold storage and implement precedence**

```sql
CREATE TABLE alert_thresholds (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  metric TEXT NOT NULL,
  operator TEXT NOT NULL,
  value NUMERIC NOT NULL,
  UNIQUE NULLS NOT DISTINCT (organization_id, metric)
);
```

```js
export async function resolveThreshold({ organizationId, metric }) {
  return (await findOrganizationThreshold(organizationId, metric)) ??
    findPlatformThreshold(metric);
}
```

- [ ] **Step 4: Restrict edits to Customer Admins for their organization and Platform Admins for global values**

Run: `npm test -- server/tests/thresholds.test.js`
Expected: PASS.

- [ ] **Step 5: Add the Customer Admin threshold settings view**

```jsx
<form onSubmit={saveThreshold}>
  <label>Metric <select name="metric" /></label>
  <label>Threshold <input name="value" type="number" required /></label>
  <button type="submit">Save threshold</button>
</form>
```

- [ ] **Step 6: Commit**

```bash
git add client server database
git commit -m "feat: manage alert thresholds"
```

### Task 8: Send Customer Admin email alerts after imports

**Files:**
- Create: `server/services/alert-evaluator.js`
- Create: `server/services/email.js`
- Create: `server/tests/alert-evaluator.test.js`
- Modify: `server/services/performance-import.js`

**Interfaces:**
- Consumes: imported metric rows from Task 5 and resolved thresholds from Task 7.
- Produces: an email to every Customer Admin in the affected organization for each threshold breach.

- [ ] **Step 1: Write failing alert tests**

```js
it('emails customer admins when imported error rate exceeds the active threshold', async () => {
  await setCustomerThreshold(orgId('CUST-001'), 'error_rate', 1);
  await evaluateAlerts(metric({ customerId: 'CUST-001', errorRate: 1.2 }));
  expect(email.send).toHaveBeenCalledWith(expect.objectContaining({
    to: ['admin@acme.test'],
    subject: expect.stringContaining('error rate')
  }));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- server/tests/alert-evaluator.test.js`
Expected: FAIL because alert evaluation is absent.

- [ ] **Step 3: Implement threshold evaluation and Customer Admin recipient lookup**

```js
const recipients = await findUsers({ organizationId: metric.organizationId, role: 'customer_admin' });
if (breachesThreshold(metric, threshold)) {
  await email.send({ to: recipients.map(({ email }) => email), subject: `${metric.name} alert`, text: formatAlert(metric) });
}
```

- [ ] **Step 4: Invoke alert evaluation after a successful import transaction**

Run: `npm test -- server/tests/alert-evaluator.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat: send customer admin performance alerts"
```

### Task 9: Complete Platform Admin management views and release verification

**Files:**
- Create: `client/src/pages/AdminOrganizationsPage.jsx`
- Create: `client/src/pages/AdminUsersPage.jsx`
- Create: `client/src/pages/AdminPerformanceDataPage.jsx`
- Create: `client/src/pages/AdminRolesPage.jsx`
- Create: `server/tests/end-to-end.test.js`

**Interfaces:**
- Consumes: Tasks 2, 5, 6, 7, and 8.
- Produces: Platform Admin screens for organization, user, data, role, and global-threshold management.

- [ ] **Step 1: Write an end-to-end authorization and dashboard test**

```js
it('keeps imported CUST-002 data unavailable to a CUST-001 customer viewer', async () => {
  await importAsPlatformAdmin(multiCustomerFile);
  const response = await asCustomerViewer('CUST-001').get('/api/metrics?range=24h');
  expect(response.body.metrics.every(({ customerId }) => customerId === 'CUST-001')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails or exposes the remaining gap**

Run: `npm test -- server/tests/end-to-end.test.js`
Expected: FAIL until all management routes and access controls are connected.

- [ ] **Step 3: Add each Platform Admin view using the existing API routes**

```jsx
<AdminNavigation items={['Organizations', 'Users', 'Performance data', 'Roles & permissions', 'Thresholds']} />
```

- [ ] **Step 4: Verify the complete system**

Run: `npm test --prefix server`
Expected: PASS.

Run: `npm test --prefix client`
Expected: PASS.

Run: `npm run migrate --prefix server`
Expected: all migrations apply to an empty PostgreSQL database.

- [ ] **Step 5: Commit**

```bash
git add client server database
git commit -m "feat: complete platform administration"
```

## Self-Review

- Spec coverage: Tasks 2–4 cover authentication, predefined roles, permissions, user management, and tenant isolation. Tasks 5–6 cover CSV/XLSX ingestion and all six dashboard metrics across the three required ranges. Tasks 7–8 cover threshold precedence and email alerts. Task 9 covers the Platform Admin management surface.
- Scope: The dashboard, user management, imports, and alerting are deployed as one system but are isolated into independently testable tasks.
- Open product decisions intentionally excluded: dashboard chart layout, exact file-column format beyond `customer_id`, and email service provider. They do not alter the confirmed product rules and must be decided before their corresponding UI/integration tasks start.
