---
name: codebase-orientation
description: Map the relevant Luméa code, documentation, tests, and trust boundaries before a large task, project recovery, or work in an unfamiliar area. Use this before implementation when file ownership or scope is unclear.
---

# Codebase Orientation

## When to use

Use for project recovery, a medium-or-larger task, or any task where the responsible code and canonical documentation are not already known.

## Workflow

1. Read `AGENTS.md`, then identify the applicable stage and gate in `docs/WORKFLOW.md`.
2. Start from `docs/LUMEA_WEBSITE_SPEC.md`; read only the architecture, data, Admin, Supabase, release, or milestone documents needed for the task.
3. Inspect Git status and the current branch before interpreting files. Preserve unrelated owner work.
4. If Graft is installed and indexed, use the graph workflow in `AGENTS.md`. Otherwise state that it is unavailable and use targeted `rg --files`, `rg`, Git history, and exact file ranges. Do not install it as part of orientation.
5. Produce a compact map of Storefront, Admin, Supabase, tests, configuration, and affected data or security boundaries. Name exact candidate files and relevant checks.
6. Record open owner decisions, documentation conflicts, and operations that require authorization before implementation.

## Stopping conditions

Stop when the source of truth, affected files, adjacent contracts, verification commands, risks, and unresolved decisions are known. Stop earlier and ask the owner if canonical documentation conflicts with implementation or a required business decision is unresolved.

## What not to do

- Do not scan or summarize the entire repository when a narrow map is sufficient.
- Do not edit code, install tools, migrate data, deploy, or broaden scope during orientation unless the user separately authorizes it.
- Do not treat generated types, seed data, or UI copy as the product source of truth when canonical documentation exists.
