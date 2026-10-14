---
name: webapp-qa
description: Verify Luméa browser behavior after a feature or change, covering scoped customer and Admin flows, errors, links, and responsive regressions. Use after changes that affect routing, forms, persistence, data loading, or browser interactions.
---

# Webapp QA

## When to use

Use after browser-visible behavior changes and before release-oriented handoff. Scale coverage to the changed flow and its adjacent critical journey.

## Workflow

1. Derive acceptance checks from the current task, `docs/WORKFLOW.md`, and the relevant product specification section.
2. Run the smallest relevant deterministic checks from `package.json`; include `npm run check:ci` and `npm run build` when the task or release gate requires them.
3. Start from local or isolated test environments. Exercise the changed customer or Admin flow end to end with realistic VI/KO data.
4. Check 390 px first, then 768 px and 1440 px where the changed behavior is responsive. Inspect browser console errors, failed requests, broken links, redirects, reload/deep-link behavior, and persistence.
5. Verify loading, empty, validation, unavailable, retry, success, and permission-denied states that are material to the change.
6. Report commands, environment, routes, data used, results, and gaps. Separate automated evidence from hands-on review.

## Stopping conditions

Stop before any production or staging mutation that was not explicitly authorized. Stop if QA could create a real Order, change Admin-managed data, consume a secret, or target an unverified Supabase project; request direction instead.

## What not to do

- Do not deploy, migrate, seed, or create production data as an implicit QA step.
- Do not use production credentials in screenshots, logs, prompts, or frontend configuration.
- Do not claim broad regression coverage from a single happy path or build result.
- Do not mask console or network failures merely because the UI appears usable.
