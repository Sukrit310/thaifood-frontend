# Shared Restaurant Cards / Grid Implementation Plan

> **For agentic workers:** Use inline execution with one fresh read-only final reviewer. Preserve prior Layout work and all unrelated dirty files.

**Goal:** Implement only section C of THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md and make its card/grid appearance consistent across the existing Home/Search/Favorites consumers.

**Architecture:** RestaurantCard owns an accessible single restaurant link around image/content and a separate optional action area. RestaurantGrid uses a native list. One colocated stylesheet supplies shared card/grid rules; remove only the duplicated card/grid selectors from index.css, Home.css and Restaurants.css. Their other page rules and JSX remain untouched.

**Tech Stack:** Existing React/Router/CSS variables/Testing Library; cached Playwright for browser QA. No new application dependencies.

**Spec:** THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md section C and quality/architecture constraints; user excludes all other sections.

## Constraints

- Allowed existing source: RestaurantCard.jsx, RestaurantGrid.jsx and only card/grid rules in index.css, Home.css and Restaurants.css. Add RestaurantCard.css and focused card/grid tests.
- Protect Layout (including its uncommitted JSX/CSS/tests), all page JSX, auth/API, global tokens/primitives, environment and dependencies using the68-file pre-task baseline in docs/qa/restaurant-cards/source-baseline.json.
- Preserve service props, /restaurants/:id, renderAction/action, real rating/reviewCount, unrated/address/image fallbacks. Never add fake scores/counts or API calls to presentational components.
- Shared grid is1column below640px,2columns640–1023px,3columns1024px and above, with minmax(0,1fr) and shared spacing.
- Images retain lazy loading, add intrinsic640×480 sizing/async decode, object-fit cover and4:3 clipping. On error switch to existing local SVG at most once.
- Category text must be exposed to assistive technology. A single keyboard stop opens the restaurant from image/content; optional favorite actions remain separate controls.
- Use existing warm tokens,18px card radius, readable title/metadata, clipped gentle hover zoom/lift, visible focus and reduced-motion behavior.
- Do not redesign page headers, filters, destination tiles, skeleton/empty/error content, Detail/account/admin/Layout. Align Home loading-grid gap with the shared grid as part of removing the duplicate grid rule.
- No deployment or live writes. Browser QA uses temporary3100 and closes it afterward; do not change port3000.

## Review Focus

- Null/invalid ratings and missing review counts must not become fabricated values or NaN; test real values, unrated, missing count and malformed numeric boundaries.
- Category text must not be inside aria-hidden content; test accessible visible metadata and one named image/content link.
- Broken image and a failing fallback must not create an error loop; test missing image, external failure, fallback failure and later prop update.
- Favorite action clicks/focus must not open the card; test native action isolation and item-specific renderAction wiring.
- Long Thai names/addresses/categories and narrow viewports must not overflow; verify actual CSS across all consumers, clip zoom, focus/Tab and reduced motion in browser.

## Task: Shared card/grid extraction

- [x] Audit brief, consumers, API contract, duplicated CSS and tests; persist source baseline including prior work.
- [x] Add focused Card/Grid behavior tests; observed7fail/6pass before implementation, then13pass.
- [x] Implement single-link card, accessible metadata, bounded fallback and native list with shared styles; surgically remove duplicate card/grid rules only.
- [x] Full test suite138pass/18suites; production build compiled successfully after removing redundant native-list role warning.
- [x] Browser QA15consumer/width cases passed; live public GET200, fixture-only favorite removal, image fallback, long text, focus/hover/reduced motion and page isolation all passed.
- [x] Fresh read-only review: no Critical/Important/Minor findings; independently confirmed68 baseline hashes. Scope/QA report and screenshots saved; temporary preview closed at task completion.

## Decisions

- The detailed brief and user instruction already authorize proceeding in C; no additional approval round.
- Related page stylesheet edits only remove card/grid duplication; other page compositions remain unchanged. Existing Header/Footer changes belong to the prior task and are protected.
- Tests cover behavior and data contracts; visual properties are checked in the real browser instead of implementation-mirroring CSS unit tests.
