# JOBLY — Email verification redirect fix

- Email OTP/magic-link emails now use `/auth/callback?next=/onboarding`.
- `/auth/callback` now handles both PKCE `code` callbacks and Supabase `token_hash` email links before redirecting.
- The callback validates `next` as a local path to prevent an open redirect.
- Added `/onboarding` to complete the verified talent account (identity, username, password, privacy, optional profile photo).
- Signup draft data is saved locally before the email is sent so the onboarding step can recover first name, last name, phone and country.
- Added `/api/auth/profile-photo` for authenticated profile-photo upload to Supabase Storage.
- Google OAuth keeps its existing `/ecosystem` destination.
