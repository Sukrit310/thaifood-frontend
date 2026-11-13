# Layout / Navigation / Footer Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in this session, with one fresh read-only final reviewer. Preserve existing user work and leave changes reviewable in this workspace.

**Goal:** Implement only section A of THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md, keeping every page body and API/auth behavior intact.

**Architecture:** Update Layout.jsx and add its own Layout.css and behavior tests. Use the existing tokens and native React Router links. A normal-flow header contains the ThaiFood. wordmark, centered desktop navigation and account actions; mobile uses an inline disclosure with no modal/backdrop or scroll locking. Footer provides separate explore/account navigation and copyright.

**Tech Stack:** Existing React, React Router, CSS variables, Testing Library/Jest; existing temporary Playwright for browser QA. No dependencies.

**Spec:** THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md section A and sections4/5; user's explicit scope excludes all other sections.

## Global Constraints

- Modify existing application source only in thaifood/src/components/Layout.jsx; create Layout.css and Layout.test.jsx alongside it.
- Keep Home/Search/Cards/Detail/account/admin page bodies, index.css, tokens, services/auth, environment, packages and deployment settings unchanged.
- Preserve main-content/skip-link behavior, demo/mock-data banner copy, current routes, guest/member/admin link visibility, logout token removal and redirect to /.
- Use shared terracotta/cream/ink, current font, spacing/control/focus/motion tokens; no fake counts or unsupported links.
- Desktop begins at1024px. Header stays in document flow so it cannot obscure page headings or keyboard focus.
- Mobile disclosure controls both main navigation and account actions. Escape returns focus to its toggle; outside pointer closes it; navigation (including query-only changes) closes it; responsive transitions never leave focus hidden.
- Footer navigation uses existing routes and the same role checks. Only header provides logout to avoid duplicate action buttons.
- No deployment, live writes or changes to port3000. Use temporary3100 for browser QA and stop it after verification.

## Review Focus

- Guest/member/admin links must match actual context in both header and footer; test all three with real AuthProvider and isolated mock API.
- Mobile keyboard users must reach every revealed link, close with Escape, then resume at the toggle; test behavior plus real-browser tab order/visibility.
- Changing only query params or selecting the current route must still close the disclosure without resetting page-specific pagination scrolling; test the close/scroll effects separately.
- Long Thai display names and 320/375/768/1024/1440px layouts must not overlap, overflow or hide logout; browser check all roles.
- Desktop/mobile resizing while focus is in the header must keep focus on a visible control and collapse the mobile state; targeted tests and browser check.

### Task 1: Shared application chrome

**Files:** Modify Layout.jsx; create Layout.css, Layout.test.jsx; add scoped QA/report documentation only.

**Interfaces:** Consumes useAuth() member/logout and isMockMode; preserves React Router Outlet and existing destinations. Produces the global header/banner/footer around unchanged main-content.

- [x] Audit current Layout, legacy styles, roles/routes, existing tests and Design System; record66-file source/config baseline at /tmp/thaifood-layout-baseline.json.
- [x] Add meaningful behavior tests for role-aware header/footer, banner/skip link, complete disclosure ARIA relationship, Escape/outside/navigation/query close, focus on close/resize, active route and logout. Initial13 cases observed11fail/2pass before implementation.
- [x] Implement local Brand mark/wordmark and layout markup, then native disclosure/focus behavior; add scoped CSS for the header/banner/footer without editing page styles.
- [x] Run targeted tests (15pass), full npm test -- --watchAll=false --runInBand (125pass/17suites), and npm run build (compiled successfully).
- [x] Browser QA at320/375/768/1024/1440px with guest/member/admin fixtures; keyboard/skip link/resize/long names/reduced motion, banner and page-style isolation. Public Render API through unchanged dev proxy returned200.
- [x] Obtain fresh read-only review, resolve its breakpoint-focus finding with RED→GREEN unit/browser regression, verify source scope against clean pre-task HEAD, and write docs/LAYOUT_NAVIGATION_FOOTER_UPDATE.md.

## Execution Notes

- User supplied the detailed brief and explicitly asked to proceed only with A; continue within that scope without another design-approval round.
- Keep legacy header/footer CSS in index.css unchanged; new Layout classes isolate this composition from existing page styles. Removing unused global rules is outside this change.
- No commit/push/deploy is part of this UI request.
- Final review: Important breakpoint-focus finding fixed. CSS may blur the old control before the media listener; retain header focus ownership during that blur and clear it on intentional focus/pointer exit. New unit regression observed1fail/14pass, then15pass; focus-check and full browser QA passed after fix. No deferred minors.
- Scope verification: pre-task application source was clean at HEAD06c32bd; final protected-source diff against that commit is empty. The initial /tmp hash file was lost when the tool environment restarted, so final scope verification uses Git HEAD rather than claiming a retained hash artifact.
