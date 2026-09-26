# Luméa Flower Studio — Delivery Workflow

## 1. Purpose

This workflow keeps product intent, user experience, implementation, operations, and review aligned. It is mandatory for significant work on the Luméa website.

The sequence is:

**Purpose → User → Structure → Design → Storyboard → Specification → Prototype → Review → Frontend → Database → Storage → Auth → Admin → Security/RLS → Testing → Deploy → Final Review → Handoff**

Stages may be revisited when review uncovers a problem, but they must not be silently skipped. A smaller task may satisfy a stage with a short written note instead of a large artifact; the gate still applies.

## 2. Roles and decision rights

- **Owner:** Sets business policy, approves product/design decisions, resolves open questions, and gives explicit permission for commit, push, and deployment.
- **Delivery agent/team:** Makes scoped recommendations, records assumptions, produces and tests the work, and reports limitations honestly.
- **AI review:** Provides input only. It does not replace user testing, operational review, or owner approval.

## 3. Stage workflow

### 3.1 Purpose

Define why the page, feature, or change exists and which business/user outcome it should improve.

**Exit gate:** One primary purpose is written in plain language; out-of-scope outcomes are named.

### 3.2 User

Identify the primary user, their context, urgency, knowledge, constraints, and main need.

**Exit gate:** The work names who uses it and the problem they are trying to solve.

### 3.3 Structure

Define information hierarchy, navigation, content groups, actions, states, and dependencies before visual polish.

**Exit gate:** The primary action is easy to locate, and the structure accounts for loading, empty, error, unavailable, and success states where relevant.

### 3.4 Design

Apply Luméa's approved visual system, typography, spacing, photography, interaction, responsive behavior, and accessibility requirements.

**Exit gate:** The design supports the primary action, works mobile-first, and avoids the prohibited visual directions in the product spec.

### 3.5 Storyboard

Describe the sequence of content and interactions as the user experiences them. For Home, preserve the approved ten-section narrative unless the owner approves a change.

**Exit gate:** Each section has a purpose, key content, primary action, and connection to the next step.

### 3.6 Specification

Document behavior, data, validation, business rules, edge cases, security/privacy needs, and acceptance criteria. Use `docs/LUMEA_WEBSITE_SPEC.md` as the product source of truth.

**Exit gate:** The specification is testable, unresolved decisions are visible, and no material business rule is hidden in implementation assumptions.

### 3.7 Prototype

Build the smallest realistic interaction needed to validate structure, content, and flow before production implementation. Use representative Vietnamese copy, images, prices, addresses, and edge cases.

**Exit gate:** The primary journey can be exercised at mobile and desktop sizes without relying on an explanation from its maker.

### 3.8 Review

Review the prototype from the customer's or staff member's perspective. Validate the product review questions in section 4 and resolve high-impact issues.

**Exit gate:** The owner accepts the direction or explicitly records remaining risks and decisions.

### 3.9 Frontend

Implement approved public and Admin interfaces. Keep stable interface structure separate from Admin-managed business content. Include all relevant states and accessible interactions.

**Exit gate:** Scoped UI behavior matches the approved prototype/specification and passes relevant local checks.

### 3.10 Database

Design data relationships and constraints for products, taxonomy, content, orders, requests, fulfillment, and settings. Preserve historical order snapshots and independent order/payment status.

Before creating migrations, use `docs/LUMEA_ARCHITECTURE.md`, `docs/LUMEA_DATA_MODEL.md`, and `docs/LUMEA_ADMIN_SCOPE.md` as the Step 8 architecture lock. Resolve or explicitly defer any owner policy needed by the current vertical slice; do not weaken the locked trust, snapshot, localization, or Admin ownership boundaries.

**Exit gate:** The model supports specified behavior, integrity constraints, migrations, and non-destructive evolution; it does not add advanced inventory or other V1 non-goals.

### 3.11 Storage

Define secure storage and delivery for product, homepage, gallery, and custom-reference images. Specify file validation, access, ownership, deletion, and orphan cleanup.

**Exit gate:** Public and private media have distinct access rules; uploads cannot bypass type/size/security requirements.

### 3.12 Auth

Implement authentication only for roles that require it in V1, primarily Admin. Customer accounts remain out of scope.

**Exit gate:** Protected screens and actions require verified identity on trusted boundaries; recovery/session behavior is documented and tested.

### 3.13 Admin

Implement business operations for products, categories, occasions, homepage, requests, orders, delivery, site, and payment settings.

The first Admin milestone is a real **Admin → Database/Storage → Storefront** Product and Media slice: create, localize, upload, publish, read in Catalog/Product Detail, then hide. Broad mock Admin screens do not satisfy this gate.

**Exit gate:** Authorized staff can change mutable content without code changes, and public refresh reflects relevant saved changes without rebuild/redeploy.

### 3.14 Security / RLS

Model least-privilege access for public reads, Admin mutations, buyer/recipient data, orders, requests, settings, and media. Review secrets, abuse paths, validation, logs, and privacy.

**Exit gate:** Access rules are tested with authorized and unauthorized cases; privileged secrets stay server-side; no production launch proceeds on assumed or UI-only security.

### 3.15 Testing

Test in proportion to scope and risk. Combine focused automated checks with hands-on flow, responsive, copy, error-state, and accessibility review.

**Exit gate:** Acceptance criteria for the change pass, regressions in adjacent critical journeys are checked, and limitations are recorded. A passing build alone does not satisfy this gate.

### 3.16 Deploy

Deploy only to the approved environment, with the owner's explicit permission. Confirm configuration, migrations, secret availability, rollback/recovery approach, indexing behavior, and smoke-test plan.

**Exit gate:** Deployment completes successfully, the intended revision is running, and production smoke checks pass. Do not begin or imply this stage without authorization.

### 3.17 Final Review

Repeat the critical user journeys in the deployed environment using realistic mobile and desktop conditions. Verify public data, Admin propagation, forms, fulfillment, payment instructions, privacy, accessibility, SEO/indexing, and failure handling.

**Exit gate:** The owner makes the final go/no-go decision after reviewing known issues and evidence. AI review remains advisory.

### 3.18 Handoff

Transfer operational knowledge: what shipped, how to manage content/orders/settings, how to verify payments, known limitations, recovery steps, and next priorities.

**Exit gate:** The owner or operator can perform routine V1 work without engineering help and has access to the required documentation and credentials through approved secure channels.

## 4. Product Review Gate

### Before significant implementation

Answer and record:

1. Why does this feature or page exist?
2. Who uses it?
3. What is the primary action?
4. Does the proposed structure support that action?

If any answer is unclear or contradictory, return to Purpose, User, or Structure before implementing.

### After implementation

- Use the feature as a real customer or staff member.
- Read the copy in context, including validation, empty, unavailable, and success states.
- Click or operate every relevant control with realistic data.
- Test mobile behavior, then tablet and desktop where relevant.
- Look for unnecessary, confusing, misleading, inaccessible, or anxiety-producing elements.
- Confirm Admin-managed content is truly editable and propagated as specified.
- Treat AI review as one input; the owner decides whether the result is acceptable.

## 5. Prompt and Codex discipline

- Small scope → small prompt. Ask for one coherent outcome at a time.
- Do not scan the whole repository when the task can be completed from a known, narrow file set.
- Match reasoning effort, exploration, and review depth to complexity and risk.
- Use an Agent Skill only when it creates concrete value for the task.
- Do not perform unrelated refactors, formatting sweeps, dependency upgrades, or cleanup.
- Test in proportion to scope, with greater depth for checkout, payment, personal data, Admin access, and fulfillment rules.
- Do not equate build success with correct behavior or good UX.
- Review the result from the user's perspective, not only from the implementation's perspective.
- State assumptions and unresolved owner decisions instead of silently inventing business policy.

## 6. Change sizing and evidence

| Change type | Minimum expected evidence |
|---|---|
| Copy or isolated content presentation | Context review, responsive visual check, link/control check |
| Localized UI behavior | Focused automated test where practical, keyboard/control check, mobile and desktop review |
| Shared component or navigation | Component tests as appropriate, affected-page regression review, responsive/accessibility check |
| Product/order/delivery/payment logic | Rule-level tests, invalid/edge cases, end-to-end happy and failure paths, data-integrity review |
| Auth, Admin permission, storage, or RLS | Authorized/unauthorized tests, direct-access attempts, secret/privacy review, audit of exposed fields |
| Deployment/configuration | Preflight, migration/config check, production smoke test, rollback/recovery readiness |

This table is a floor, not a substitute for judgment.

## 7. GitHub, Git, and deployment discipline

- Until the owner explicitly authorizes it, do not commit, push, open a pull request, deploy, or change production.
- Keep changes focused and do not include unrelated owner work.
- Once GitHub is connected and delivery is authorized, use this sequence:

  1. Complete the scoped code task.
  2. Pass the relevant test and review gates.
  3. Inspect the final diff for scope, secrets, generated files, and accidental changes.
  4. Commit with a focused message.
  5. Push the approved branch.
  6. Use GitHub CLI to monitor the related checks/deployment until success or an actionable failure is identified.
  7. Perform the required post-deploy smoke and user-flow review.

- A green remote check does not replace hands-on product review.
- If deployment fails, report the exact failure and evidence. Do not broaden scope or make speculative production changes without approval.

## 8. Definition of done

A task is done only when:

- Its purpose, user, primary action, and scope are clear.
- The implementation matches the approved specification and design direction.
- Relevant acceptance criteria and proportional tests pass.
- Responsive, accessibility, copy, controls, and realistic user flows have been reviewed.
- Security/privacy implications and Admin content ownership have been addressed.
- No unrelated work or V1 non-goals were introduced.
- Documentation and open decisions are current.
- Any Git or deploy action was explicitly authorized and reported.

## 9. Final report template

1. **Scope completed:** What user/business outcome was delivered.
2. **Files changed:** Created, modified, or removed files.
3. **Verification:** Automated checks and hands-on user-flow reviews, with results.
4. **Known limitations and decisions:** Assumptions, unresolved owner decisions, and follow-up risks.
5. **Git/deploy status:** Commit, push, pull request, and deployment actions taken, or a clear statement that none were taken.
