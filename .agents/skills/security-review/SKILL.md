---
name: security-review
description: Review Luméa changes that touch Auth, Supabase, RLS, RPCs, Edge Functions, Checkout, money, private data, or secrets. Use when a change crosses a trusted boundary or changes authorization, grants, validation, or pricing behavior.
---

# Security Review

## When to use

Use for changes involving authentication, authorization, database policies, privileged functions, Storage, Checkout, payment or delivery totals, Edge Functions, sensitive data, or environment variables.

## Workflow

1. Read the changed diff and the applicable boundaries in `docs/LUMEA_ARCHITECTURE.md`, `docs/LUMEA_DATA_MODEL.md`, `docs/LUMEA_ADMIN_SCOPE.md`, and `docs/SUPABASE_SETUP.md`.
2. Trace untrusted input from browser to the authoritative boundary. Confirm server-side validation for identity, authorization, state, quantities, money, and idempotency.
3. Review RLS, table grants, function execute grants, direct-RPC access, role checks, and public field exposure. Test allowed and denied roles, including direct access attempts.
4. For `SECURITY DEFINER`, require a fixed empty `search_path`, schema-qualified objects, bounded inputs, least-privilege grants, and explicit server-side role checks.
5. Confirm `service_role`, Supabase secret keys, Turnstile secrets, HMAC material, database credentials, and private customer data cannot reach browser bundles or logs.
6. Run the relevant deterministic, SQL, and secret checks available for the authorized environment. Report findings by severity with exact file and line evidence.

## Stopping conditions

Stop if the intended authorization or business-money rule is unclear, if a test requires production secrets, or if verification would require an unauthorized migration or live mutation. Treat an untested privileged boundary as unresolved, not passed.

## What not to do

- Do not weaken RLS, grants, validation, Turnstile, throttling, or direct-RPC restrictions to make a test pass.
- Do not rely on hidden UI, route guards, or client prices as security controls.
- Do not print, commit, request in chat, or copy production secrets into local frontend env files.
- Do not perform a broad penetration test outside the authorized scope.
