# Platform administration

## Purpose

Platform Admins operate the dashboard across all customer organizations. This is the only role that can create organizations, run multi-customer imports, manage global defaults, and oversee user access.

## Administration areas

- **Organizations:** create and update customer records and customer IDs.
- **Users:** invite, change permitted roles, revoke sessions, and remove users.
- **Performance data:** upload files, inspect import results, and correct source data through a controlled process.
- **Roles and permissions:** view the fixed role matrix; roles are predefined, not custom.
- **Thresholds:** set platform defaults and review organization overrides.

## User experience flow

1. A Platform Admin signs in and opens the administration navigation.
2. They select an area, complete the relevant form, and receive success or validation feedback.
3. Privileged actions call a trusted server or Edge Function, never a browser-held secret key.
4. The page refreshes its RLS-protected data and records an audit event for high-impact actions.

## Operational safeguards

- Require explicit confirmation before removing users or overwriting imported data.
- Log who performed an import, user change, threshold change, or organization change.
- Keep the fixed role model until a real requirement for custom permissions exists.
