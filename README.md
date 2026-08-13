# OMELY COFFEE — production build

## Run
1. Copy `.env.example` to `.env.local`.
2. Put your Supabase URL + publishable key in the NEXT_PUBLIC variables.
3. Put the Supabase server-only secret in `SUPABASE_SECRET_KEY`.
4. Run `supabase/schema.sql` in Supabase SQL Editor.
5. `npm install`
6. `npm run dev`
7. Customer: `/?table=07`
8. Admin: `/admin`

## Production requirements
- Use a server-only secret key only in server runtime.
- Add Supabase Auth and role-based authorization before opening `/admin`.
- Configure RLS policies for owner/manager/staff.
- Enable Realtime for orders and staff_calls.
- Use a payment provider webhook for online payments; never trust a client-side "paid" flag.
- Add rate limiting/WAF, CSRF strategy where applicable, secure cookies, audit logs, monitoring and encrypted backups.
- Test against OWASP ASVS/WSTG.

This repository is a production-oriented starter, not a claim of absolute security or a substitute for a security audit.
