# Account Pages Implementation Plan

> **For agentic workers:** Inline implementation with one fresh read-only final reviewer. Preserve all prior UI work and unrelated dirty files.

**Goal:** Implement only F.Login/Register/Favorites/Profile/Change Password from THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md.

**Architecture:** A small presentation-only AccountLayout module supplies the auth split composition, existing-route account navigation and focused error summary. One colocated stylesheet is scoped under .account-page. The five pages retain their current auth/service/validation/redirect handlers, with UI-only busy/feedback/field-description improvements. Favorites reuses the existing shared card/grid without overrides.

**Tech Stack:** Existing React/Router/CSS tokens and test tools; existing local food image. No dependencies or new auth endpoints.

**Spec:** Brief section F and quality/architecture requirements; user excludes all other sections.

## Constraints

- Existing production source allowed: Login.jsx, Register.jsx, Favorites.jsx, Profile.jsx, ChangePassword.jsx. Add AccountLayout.jsx/CSS and AccountPages.test.jsx plus docs/QA only.
- Compare72 baseline source/config files against docs/qa/account-pages/source-baseline.json; only the five account pages may differ, leaving67 protected files unchanged.
- Preserve AuthContext, ProtectedRoute/role gates, service endpoints/payload field names, token/session behavior and return pathname/search/hash semantics. Registration still returns to Login with registered/from state; signed-in redirects remain unchanged.
- Preserve Unicode display-name and UTF8-password validators, byte limits and existing hint text. Do not add character-based minlength/maxlength or trim passwords.
- Error summaries are visible, announced and focused after failed user actions. Client invalid fields reference the summary; server/network errors do not falsely mark all fields invalid. Pending editable controls/submit disable and restore entered values on error.
- Mock-account disclosure remains Mock-only. Do not add social sign-in, password recovery, email editing or unsupported flows.
- Auth split story uses existing local food art, has no interactive elements and is hidden on narrow screens. Form remains first in DOM; all form fields have stable separate labels.
- Favorites uses true API items only; no false0 on errors. Loading skeleton/empty/retry and focused mutation feedback are scoped to this page; shared card actions and service methods stay unchanged.
- Account links target only /profile, /change-password, /favorites; no Admin redesign or global CSS changes.
- No deploy/live writes/port3000 changes. Browser fixtures intercept all account mutations; temporary3100 closes after QA.

## Review Focus

- Login/Register links and successful registration preserve from state; tests cover requested destination and safe fallback through existing tests.
- Failed submits retain values, focus useful error summary and restore controls; test pending/API error/client-invalid boundaries.
- Profile sends displayName only; email stays read-only and long Unicode names wrap. Password update sends current/new untrimmed, clears fields only after success; use current validation tests too.
- Favorite errors do not invent counts or drop cards on failed remove; test empty/retry/pending/remove success and heading focus.
- Responsive form/card layouts, keyboard order, role-aware account summaries, notices and shared-card isolation must hold at320/375/768/1024/1440.

## Task: Section F account UI

- [x] Audit all five pages, existing auth/validation/routes/tests; persist72-file baseline.
- [x] Add focused account UI/contract tests and observe intended new expectations fail (17 initial UI cases plus2 validation-description cases).
- [x] Implement shared presentation/scoped stylesheet and update only the five account pages.
- [x] Run targeted tests, full existing suite and production build; inspect actual outputs. Final190 tests/20 suites pass; optimized build compiles successfully.
- [x] Browser QA all five routes/widths, guest/member/admin fixtures, validation/error/busy/success/draft/navigation/favorite flows, long text, keyboard/reduced motion and route isolation.25 viewport cases,11 intercepted mutations,0 page errors; no real account writes.
- [x] Fresh read-only review, scope/hash verification, report/screenshots, stop temporary preview and Thai handoff. Reviewer P3 repeated-error-focus reproduced red in4 forms and fixed with a presentation-only attempt counter; full suite/browser/build pass after fix.67 protected files unchanged; source changes only5 pages+3 new account files. PreviewPID8304 verified and stopped; port3100 rejects connections.

## Decisions

- User supplied the brief and asked to proceed only with F; continue without another design-approval round.
- Shared account helpers are presentation-only; authentication and validation authority remain in the existing modules.
- No new images or auth features: reuse current local image with bounded fallback and retain supported account fields/routes only.
