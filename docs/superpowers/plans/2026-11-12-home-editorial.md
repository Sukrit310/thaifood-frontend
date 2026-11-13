# ThaiFood Home Editorial Implementation Plan

**Goal:** Redesign only Home according to THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md, preserving real API, search routes, auth and every other page.

**Architecture:** Keep the current React/CRA stack, service layer, resource hook and shared restaurant components. Add Home-scoped CSS tokens and overrides; do not modify global layout, shared components, API, backend or environment. Use the already self-hosted Noto Sans Thai font. Editorial light theme, terracotta/cream/espresso, layout variance 6, motion 3, density 3.

**Spec:** THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md, narrowed by the user's explicit Home-only instruction.

## Global constraints

- Preserve existing dirty changes and work directly in this workspace as requested; no commits, deployment, framework migration or application dependencies.
- Keep query parameters and Thai province values exactly compatible with existing routes.
- Use only actual restaurant service results; no unsupported counts, rankings, scores or fallback to mock.
- Keep the shared demonstration banner, navigation, auth and role checks intact.
- Scope every new style to Home. Shared restaurant cards receive styling only within Home.
- Respect keyboard focus, reduced motion, image fallback, and responsive layouts.

## Tasks

- [x] Audit existing Home, shared components, routes, resource states and tests.
- [x] Add Home tests for the editorial sections, search query/province routing, destinations, API states/retry, and image fallback. Run before implementation.
- [x] Create a local hero image asset; document its generated provenance and prompt.
- [x] Implement Home JSX and colocated scoped CSS: editorial hero, prominent search, destination tiles, responsive API restaurant grid, community CTA, and resource states.
- [x] Run targeted tests, then the existing full suite and production build using package scripts.
- [x] Verify in a browser at 375/768/1024/1440px: overflow, keyboard, search, destinations, images, reduced motion and route isolation.
- [x] Review the final diff and report Home changes, files, actual checks and how to preview. Leave all other pages for the user's next instruction.

## Review focus

- API province request fails while keyword search remains usable and province Retry recovers.
- Restaurants pending, empty or failing never produce fake restaurant content or unsupported claims.
- Long Thai names and loaded/broken images never overflow small screens.
- Search preserves trimmed Thai text and the exact province name in URL parameters.
- Home styles cannot alter Restaurants, Login, Profile or Admin after navigation.

## Execution record

Audit complete. Existing Home uses real service results but has a hard-coded province count, tiny text, a green palette and shared page selectors. Shared Layout and API functions will remain untouched. The user explicitly requested immediate implementation from the supplied spec, so no design approval question is needed.

Complete: targeted Home tests9/9, full suite100/100, production build, Chromium live API + controlled states + four viewports. Browser screenshots and results are under docs/qa/home-editorial; details and image prompt are in docs/HOME_UI_UPDATE.md. Final read-only review found no concrete bug/regression. No deployment or work on other pages was performed.
