# Supabase setup

## Apply the schema

Open the project SQL Editor and run the full SQL from `supabase/migrations/202607250001_phase_1_dashboard.sql`.

## Configure authentication

In Authentication, add the local development URL and the deployed website URL to the allowed redirect URLs. Password-recovery links return to the approved website URL.

## Create the first customer user

1. Create the user in Authentication > Users.
2. Copy that user’s UUID.
3. Insert one organization, then insert a matching `profiles` row using the UUID, organization ID, email, display name, and `customer_admin` or `customer_viewer` role.
4. Insert one or more `performance_metrics` rows for that organization.

The signed-in dashboard will then load only that organization’s rows through RLS.
