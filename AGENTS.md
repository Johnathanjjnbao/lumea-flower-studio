# Luméa Flower Studio — Agent Instructions

## Source of truth

- Product and design source of truth: `docs/LUMEA_WEBSITE_SPEC.md`.
- Delivery process and review gates: `docs/WORKFLOW.md`.
- If implementation and documentation conflict, stop and resolve the conflict with the owner before continuing.

## Mandatory workflow

- Follow the stages and exit gates in `docs/WORKFLOW.md` in order.
- Before significant implementation, answer the four Product Review Gate questions in the workflow.
- Do not begin a later stage while an earlier required decision or approval is unresolved.

## Scope discipline

- Keep each task and prompt narrowly scoped; match effort and testing depth to risk and complexity.
- Inspect only the files needed for the current task.
- Do not add unrequested features, packages, infrastructure, or unrelated refactors.
- Treat the V1 non-goals in the product spec as explicit exclusions.

## Product and responsive requirements

- Optimize the public experience for completing a flower order with minimal friction.
- Build and review mobile-first, then verify tablet and desktop layouts.
- A successful build is not evidence of good UX. Review real copy, controls, states, and end-to-end flows as a user.
- Meet the accessibility and responsive requirements in the product spec.

## Admin-managed content

- Business-mutable content must be managed through Admin and persisted in the future database/storage layer.
- Do not hard-code mutable catalog, price, availability, homepage, contact, delivery, payment, or social content in the frontend.
- A saved Admin change must appear on the public site after refresh without a rebuild or redeploy.

## Security and secrets

- Never commit credentials, tokens, bank secrets, private keys, or production personal data.
- Keep secrets in approved environment/secret storage and expose only explicitly public values to the browser.
- Validate authorization server-side; apply least privilege and the RLS/security gate before release.
- Treat buyer, recipient, order, message, address, and uploaded-image data as sensitive.

## Git discipline

- Make focused changes and preserve unrelated owner work.
- Do not commit, push, open a pull request, trigger deployment, or change production without explicit owner permission.
- When GitHub is connected and the owner authorizes delivery: complete the scoped task, pass relevant checks, commit, push, then use GitHub CLI to monitor deployment.

## Final report format

End implementation tasks with:

1. Scope completed.
2. Files changed.
3. Checks and user-flow reviews performed, including results.
4. Known limitations, assumptions, and unresolved owner decisions.
5. Git/deploy actions taken, or an explicit statement that none were taken.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->

