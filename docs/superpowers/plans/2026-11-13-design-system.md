# ThaiFood Shared Design System Implementation Plan

**Goal:** Implement only the central design-system phase of THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md. Preserve page layouts, JSX components, API, auth, routes, data and dependencies.

**Approach:** Extract a single shared token source and foundation stylesheet; retain legacy CSS/color aliases for existing consumers. Home consumes the central palette instead of defining a second one. Add semantic Tailwind mappings for new work without recoloring existing hard-coded green utility classes globally.

## Scope

- Colors: existing Home terracotta, cream and espresso; accessible controls/focus and semantic feedback colors.
- Typography: existing self-hosted Noto Sans Thai, responsive heading scale and legible body/input sizes.
- Spacing/container, radii, light shadows and motion tokens.
- Shared buttons, inputs, fields, panels, text utilities, focus, loading/empty/error primitives and disabled/readonly/invalid states.
- No header/menu/footer redesign, restaurant-card redesign, page layout changes, backend/environment changes or deployment.

## Tasks

- [x] Inspect existing global/Home styles and capture source-file baseline.
- [x] Add styles/tokens.css and styles/primitives.css; remove competing foundation declarations from index.css.
- [x] Wire stylesheet imports, semantic Tailwind tokens and Home token consumption.
- [x] Verify build and all existing tests.
- [x] Verify shared controls and representative unchanged pages at 375/768/1024/1440px, token contrast, keyboard, disabled/readonly/invalid and reduced-motion states.
- [x] Review the scoped diff; document tokens, usage, actual verification and remaining page-specific design work.

## Verification boundaries

No application code is being added, so existing behavioral tests and browser checks are used instead of tests that mirror token values. Browser fixtures may emulate member/admin responses only in the QA context; no live member/admin writes. Use a temporary preview on port3100 for QA, keeping port3000 under the user's control.

## Execution results

100 tests/16 suites and production build passed. Browser checks passed20page/viewport combinations plus shared control states, root-token updates and Tailwind opacity. The state checks exposed disabled/readonly and invalid/hover selector precedence defects; both were corrected and the full browser verification passed. A read-only final review found no important issues. Source hashes confirm unchanged page JSX, API/auth, tests and dependencies. See docs/DESIGN_SYSTEM.md and docs/qa/design-system/results.json.
