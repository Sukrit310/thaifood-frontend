# Restaurant Detail Implementation Plan

> **For agentic workers:** Implement inline with one fresh read-only final reviewer. Preserve prior Layout/Card/Home/Search work and unrelated dirty files.

**Goal:** Implement only section E of THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md, preserving API/auth/review/favorite/map contracts.

**Architecture:** RestaurantDetail owns a route-keyed content component and colocated, page-scoped CSS. Desktop has story/image/reviews on the left and visit/favorite sidebar on the right. Mobile DOM order is story → visit details → reviews. Existing ReviewList/Form keep their service/permission/validation behavior with small presentation/semantics changes only.

**Tech Stack:** Existing React/Router, service layer, useResource, CSS tokens, Testing Library/Jest and cached Playwright. No dependencies or external image assets.

**Spec:** Brief section E + responsive/accessibility/architecture requirements; user excludes all other sections.

## Constraints

- Existing allowed source: RestaurantDetail.jsx, ReviewList.jsx and ReviewForm.jsx. Add RestaurantDetail.css and RestaurantDetail.test.jsx only, plus task docs/QA. One related Journey.test.jsx assertion is narrowed to the saved review article (see execution note).
- Protect all other70 baseline source/config files, including uncommitted Layout/Card work and index.css, with docs/qa/restaurant-detail/source-baseline.json.
- Preserve /restaurants/:id, breadcrumb province query, exact service methods/payloads, member/admin review permissions, existing delete confirmation, one-review notice and login return pathname.
- Keep real rating/reviewCount; no invented counts/scores. Missing address/description gets honest copy. Hero uses existing imageUrl/local fallback with bounded error handling.
- Map remains OpenStreetMap at zoom16; render only for finite in-range latitude/longitude. Reject blank/absent/non-numeric/out-of-range values; retain valid0 coordinates and numeric strings.
- Separate favorite and review success messages near their actions; retain errors/retries. Key per restaurant ID prevents stale drafts/busy/feedback from leaking across detail routes without changing global hooks/auth.
- Scoped CSS only under .restaurant-detail-page; no global style extraction or other page redesign.
- Keep native radio controls; improve their touch size and visual numeric labels. Review rating graphics have an accessible image role/name, and empty review headings fit section hierarchy.
- No deploy, real writes, port3000 changes or new dependencies. Use temporary3100 for QA and close it afterward.

## Review Focus

- Guest CTAs return to this restaurant after login; cover both review/favorite paths and no private favorite request for guests.
- Review/favorite failures remain isolated from the loaded story and each other; cover retries, pending/failed favorite writes and retained review draft.
- One-review policy, owner/admin delete permissions and refresh of true rating/count survive markup changes; use real ReviewList/Form with service-boundary fixtures plus existing Journey tests.
- Malformed/partial coordinates must not create broken map links; cover invalid/blank/bounds and validzero/numeric strings.
- Route switches while an old mutation is pending must not show stale success/busy state on the next restaurant; cover keyed lifecycle.

## Task: Detail page and its review presentation

- [x] Audit brief/current page/services/review components/legacy styles/tests; persist70-file baseline.
- [x] Add26focused behavior tests; observed20fail/6pass before implementation. All26pass in the final suite.
- [x] Implement editorial detail markup, local loading/error states and scoped CSS; preserve service/auth contracts and update only review presentation/semantics.
- [x] Full suite164pass/19suites and production build compiled successfully. The related Journey selector correction preserves all persistence/count/delete checks.
- [x] Browser QA15role/width combinations plus long-content5widths passed, including fixture-only review/favorite writes, all resource states, keyboard/focus/reduced motion and route/style isolation. Live detail GET200 through unchanged Render proxy; zero live writes/page errors.
- [x] Fresh read-only source review approved without Critical/Important/Minor findings;70baseline hashes independently checked. QA report/screenshots saved; preview closed at task completion.

## Decisions

- Detailed brief/user instruction already authorize work in E; proceed without another approval round.
- Header is part of prior Layout; the Detail sidebar stays in normal flow to avoid obstructing content in short viewports or with long addresses.
- Review mutations in browser QA are intercepted fixtures only. Existing integration tests cover actual mock-service flows; public live API QA is read-only.
- Integration verification exposed a pre-existing ambiguous Journey selector: findByText matched the entered TEXTAREA, which was detached while reviews refreshed. Diagnostic probe confirmed TEXTAREA/isConnected=false. Narrow that one assertion to the actual review article paragraph; preserve all persistence/rating/count/delete checks and the other Journey scenarios.
- Browser QA reads the retained review draft by its textbox role/name after typing; getByLabel exact was unsuitable once React updated text content inside the existing wrapping label. The textbox retained its stable accessible name and draft; no product change was needed for that QA locator issue.
