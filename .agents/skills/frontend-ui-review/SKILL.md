---
name: frontend-ui-review
description: Review Luméa Storefront or Admin UI changes for VI/KO content, responsive behavior, accessibility, and visual-system consistency. Use when UI markup, styles, interactions, or visible states change.
---

# Frontend UI Review

## When to use

Use after changing a Storefront or Admin page, component, style, visible state, navigation interaction, or form behavior. Use it before calling UI work complete.

## Workflow

1. Read the applicable product requirements plus the visual, responsive, and accessibility sections of `docs/LUMEA_WEBSITE_SPEC.md`.
2. Identify the primary action and review realistic loading, empty, error, unavailable, validation, and success states in scope.
3. Exercise both VI and KO. Check long copy, prices, addresses, labels, wrapping, truncation, and locale routes rather than reviewing placeholders alone.
4. Review at 390 px, 768 px, and 1440 px. Check typography, spacing, alignment, image crop, overflow, sticky elements, dialogs, drawers, tables, and touch targets.
5. Use keyboard navigation and inspect focus order, visible focus, labels, semantic structure, contrast, error association, and screen-reader-relevant state. Confirm reduced-motion behavior when animation is present.
6. Compare the result with Luméa's editorial floral direction; report concrete regressions with route, viewport, locale, and evidence.

## Stopping conditions

Stop with a pass/fail report for each relevant locale and viewport. Stop and report a blocker if realistic data, a required route, or the authorized environment is unavailable.

## What not to do

- Do not redesign unrelated surfaces or introduce a new visual direction during review.
- Do not accept a successful build as UX evidence.
- Do not hard-code mutable business content to make a screen look complete.
- Do not silently waive accessibility or responsive failures.
