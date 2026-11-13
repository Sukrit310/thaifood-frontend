# Restaurant Search UI Implementation Plan

**Goal:** Implement only Restaurant Search/Explore (section D of THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md), preserving existing API/service/URL behavior and every other page.

**Design:** Existing shared terracotta/cream tokens; editorial page heading, readable keyword/province/category controls, collapsible extra filters on mobile, clear active-filter removal, actual API totals, card-shaped skeletons and contextual empty/error states. Reuse the current RestaurantGrid; all page/card visual overrides remain under .restaurants-page.

## Constraints

- Change Restaurants.jsx, its colocated CSS and tests only, plus task documentation/QA artifacts.
- No shared components, Home, detail/account/admin pages, global design tokens, auth, API, environment or dependency changes.
- Keep query keys q/province/category/page and limit12; selects apply immediately, keyword applies on submit, filter changes reset page1, and pagination preserves query values.
- Do not add backend-unsupported filters, fake totals, scores or popularity labels.
- Keep pending/error totals honest; filter-option failure must not disable keyword search or discard filters in the URL.
- Mobile advanced-filter toggle uses native buttons, labels and aria-expanded/aria-controls; respect reduced motion.
- No deployment. Use temporary port3100 for QA and close it after verification.

## Tasks

- [x] Inspect the brief/current page/service/state hooks, and record a source baseline.
- [x] Expand existing tests for query restoration, filters, pagination/history, active filter removal, partial API failure and empty/out-of-range states; observe new expectations fail.
- [x] Implement the Search-only JSX and scoped stylesheet.
- [x] Run targeted tests, existing full suite and production build.
- [x] Browser verify375/768/1024/1440px, keyboard/mobile filters, query flows, resource states, API/card rendering and route/style isolation.
- [x] Read-only review, scope/hash check and QA documentation. See docs/RESTAURANTS_SEARCH_UI_UPDATE.md for results and preview instructions.
