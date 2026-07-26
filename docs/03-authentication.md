# Authentication and recovery

## Purpose

Supabase Auth handles identity, password hashing, session refresh, and password recovery. The application owns only the profile, organization membership, and application role.

## Sign-in experience

1. The user enters email and password on the Sign in page.
2. The app calls `supabase.auth.signInWithPassword`.
3. On success, it loads the profile and routes the user to the dashboard or administration area allowed by their role.
4. On failure, it gives a generic sign-in error and does not disclose whether the account exists.

## Password recovery experience

1. The user chooses **Forgot password** and enters an email address.
2. The app calls `resetPasswordForEmail` with the approved application callback URL.
3. Supabase sends the recovery link. The page confirms that the request was submitted without revealing account existence.
4. The recovery callback receives the Supabase recovery session, prompts for a new password, and calls `updateUser`.
5. The user is returned to sign-in or the dashboard.

## Safeguards

- Configure only trusted redirect URLs in Supabase Auth.
- Keep the publishable key in the client; use the secret key only in trusted code.
- Treat the Supabase session as identity, but use RLS—not UI routing alone—for authorization.
