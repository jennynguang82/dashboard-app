# Organizations and users

## Purpose

Organizations are the tenant boundary. Each organization has a unique customer ID, a name, and many user profiles. A profile links one Supabase Auth user to one organization and one predefined application role.

## Data model

- `organizations`: `id`, `customer_id`, `name`, timestamps.
- `profiles`: `id` → `auth.users.id`, `organization_id` (nullable only for Platform Admins), `role`, timestamps.

Use the role text values `customer_admin`, `customer_viewer`, `support_analyst`, and `platform_admin`. Do not put editable role data in `user_metadata`; store it in `profiles` and enforce it with RLS. A user-created profile trigger may copy only safe defaults from a new Auth user; privileged provisioning assigns the organization and role.

## User experience flow

1. A Platform Admin creates an organization and receives its customer ID.
2. The admin opens Users, chooses the organization, email address, and permitted role.
3. A trusted server or Edge Function calls Supabase Auth’s admin invite API and creates the profile.
4. The invited user receives an email, sets a password, then signs in.
5. A Customer Admin follows the same flow, but can invite only Customer Admins or Viewers for their own organization.

## Rules

- There is no public registration.
- Customer Admins cannot move users between organizations or assign platform roles.
- Removing a user revokes their sessions before deleting their Auth user and profile.
