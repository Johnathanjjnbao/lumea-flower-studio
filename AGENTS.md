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

