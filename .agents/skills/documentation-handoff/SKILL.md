---
name: documentation-handoff
description: Update Luméa's canonical documentation and produce milestone handoff evidence when a milestone or release boundary is complete. Use after implementation and acceptance evidence exist, not to speculate about unfinished work.
---

# Documentation Handoff

## When to use

Use when closing an approved milestone, release, production acceptance, or operational handoff.

## Workflow

1. Identify the canonical existing document for product behavior, architecture, data, Admin ownership, Supabase operations, release status, or owner operations. Prefer updating it over creating another summary.
2. Verify every status claim against Git history, the implemented diff, migrations, checks, browser review, and authorized deployment evidence.
3. Keep V1 history distinct from later milestones. State what changed, what remained compatible, and which decisions or business policies are still open.
4. Record exact scope, migration or release ordering when relevant, QA commands and results, user-flow evidence, limitations, recovery notes, and owner decisions.
5. Cross-check related canonical documents for stale status or contradictory claims. Update only documents owned by the completed scope.
6. Finish with the report format required by `AGENTS.md` and distinguish engineering acceptance from business-launch acceptance.

## Stopping conditions

Stop if implementation, documentation, Git state, or acceptance evidence disagree. Ask the owner before declaring release, production acceptance, or a resolved business policy without authoritative evidence.

## What not to do

- Do not create duplicate handoff, status, or architecture documents when a canonical file already exists.
- Do not rewrite V1 history to describe V2 behavior or backfill facts that were not captured at the time.
- Do not record secrets, production personal data, private credentials, or synthetic evidence presented as real acceptance.
- Do not claim deploy, migration, QA, or owner approval that did not occur.
