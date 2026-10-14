---
name: code-review
description: Review a substantive Luméa task before commit or push, focusing on changed files, regressions, compatibility, scope, and missing tests. Use when implementation is complete and the diff is ready for a report-first review.
---

# Code Review

## When to use

Use before committing or pushing a medium-or-larger task, or whenever the owner requests a review of an existing diff.

## Workflow

1. Inspect Git status, the intended base, changed files, and the diff. Separate task changes from unrelated owner work.
2. Review changed files first, then only immediate callers, schemas, tests, and documentation needed to validate behavior.
3. Check correctness, backward compatibility, data and snapshot integrity, VI/KO behavior, responsive impact, accessibility, error handling, and unintended scope.
4. Look for stale branches, dead code, duplicated logic, partial writes, unsafe fallbacks, hidden behavior changes, and missing migration or test coverage.
5. Confirm the verification depth matches the risk and that failures or skipped checks are reported honestly.
6. Lead with actionable findings ordered by severity. Give exact file and line references, then list residual risks and test gaps. If there are no findings, say so explicitly.

## Stopping conditions

Stop when every changed file and relevant adjacent contract has been reviewed and findings are evidence-backed. Stop before commit or push if a material finding, unresolved owner decision, failing required check, or mixed unrelated diff remains.

## What not to do

- Do not review the whole repository without a demonstrated dependency path.
- Do not modify code during a report-only review unless the user asks for fixes.
- Do not treat formatting preferences as defects unless they violate an established project convention.
- Do not let this review substitute for UI, browser-flow, or security review when those triggers apply.
