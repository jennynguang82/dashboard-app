# UI page guide

This guide turns the dashboard modules into a small, role-aware page set. Navigation shows only actions the current user may take; Supabase RLS remains the final access control.

## Navigation

| Area | Pages | Visible to |
| --- | --- | --- |
| Account | Sign in, Forgot password, Reset password | Signed-out users |
| Dashboard | Performance dashboard | All signed-in users |
| Customer settings | Users, Alert thresholds | Customer Admins |
| Administration | Organizations, Users, Performance data, Global thresholds, Roles | Platform Admins |

Support Analysts enter the dashboard or an approved diagnostics view, with no management navigation.

## 1. Sign in

**Purpose:** Start a Supabase Auth email/password session.

**Content:** Email field, password field, Sign in button, Forgot password link, and a generic invalid-credentials message.

**Flow:** User submits credentials → loading state → authenticated session → profile lookup → dashboard or permitted administration landing page. The screen never reveals whether an email address exists.

## 2. Forgot password

**Purpose:** Request a Supabase password-recovery email.

**Content:** Email field, Send recovery link button, Return to sign in link, and neutral confirmation message.

**Flow:** User submits email → request is sent → confirmation explains that a recovery email will arrive if the address is registered.

## 3. Reset password

**Purpose:** Let a user set a new password after opening the Supabase recovery link.

**Content:** New-password and confirm-password fields, Save password button, expired-link error state.

**Flow:** Recovery session is validated → user enters matching password → password updates → user returns to Sign in.

## 4. Performance dashboard

**Purpose:** Show the signed-in organization’s operational health.

**Content:** Range selector (24 hours, 7 days, 30 days), last-updated timestamp, six metric cards, trend charts, incident summary, loading skeleton, empty state, and retry state.

**Metric cards:** Uptime, response time, error rate, transaction volume, availability, and incidents. Each card labels its unit clearly.

**Flow:** Dashboard opens on 24 hours → metrics load through RLS-scoped queries → user selects another range → charts and summaries refresh → empty range explains that no performance data exists yet.

## 5. Customer users

**Purpose:** Allow a Customer Admin to manage only users in their organization.

**Content:** User table (name/email, role, status), Invite user button, invite form, and revoke/remove confirmation.

**Flow:** Customer Admin opens Users → sees their organization’s users → chooses role and email → sends invitation → invited user appears as pending → user completes activation from the invite email.

**Rules:** Customer Admins can create Customer Admin or Customer Viewer accounts for their own organization only. Platform roles and cross-organization changes are unavailable.

## 6. Alert thresholds

**Purpose:** Let Customer Admins set organization-level threshold overrides.

**Content:** Metric list, current threshold, source badge (Organization override or Platform default), edit action, operator selector, value field, and save feedback.

**Flow:** Admin opens thresholds → sees active values and inherited defaults → edits a metric → save succeeds → the source badge changes to Organization override → subsequent imports use the new value.

## 7. Organizations (Platform Admin)

**Purpose:** Create and manage customer organizations.

**Content:** Searchable organization table, Create organization button, customer ID and name form, and organization detail page.

**Flow:** Platform Admin creates an organization → receives validation feedback → organization appears in the list → admin can open its detail page to manage users, imports, and overrides.

## 8. Users (Platform Admin)

**Purpose:** Manage access across all organizations.

**Content:** Filterable user table, organization filter, Invite user button, role selector, session revoke/remove actions, and confirmation dialogs.

**Flow:** Admin filters or selects an organization → invites a user with a permitted role → the trusted backend sends the Supabase invitation → admin can later change access or revoke sessions before removal.

## 9. Performance data (Platform Admin)

**Purpose:** Import multi-customer performance files and review outcomes.

**Content:** CSV/XLSX upload drop zone, required-columns help, Upload button, validation error list, import history, imported-row count, and affected-organization summary.

**Flow:** Admin selects file → UI validates file type → trusted importer validates headers, values, and customer IDs → all rows commit or none do → UI shows completion or actionable row errors → alert evaluation starts after a successful import.

## 10. Global thresholds (Platform Admin)

**Purpose:** Maintain default alert thresholds for customers without overrides.

**Content:** Metric rows, comparison operator, default value, count of organization overrides, edit form, and save feedback.

**Flow:** Admin edits a global default → save succeeds → customers without a custom value use the new default on their next import. Existing organization overrides remain unchanged.

## 11. Roles and permissions (Platform Admin)

**Purpose:** Explain the fixed access model without introducing custom roles.

**Content:** Role-permission matrix, role descriptions, and links to the related management pages.

**Flow:** Admin opens the page → reviews what each role can do → navigates to Users when access needs to change. Roles themselves are not editable.

## Shared states and accessibility

- Use visible labels, keyboard-operable controls, and focusable error summaries.
- Show a loading state for every data request and a clear empty state when data is absent.
- Confirm destructive actions, such as revoking access or deleting imported data.
- Hide unavailable actions in the UI, but always expect RLS or trusted-server authorization to reject unauthorized requests.
