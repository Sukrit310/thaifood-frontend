# Admin member roles implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. The user explicitly requested immediate implementation of the supplied brief.

**Goal:** Let an Admin change another member's role from the existing member directory, using the Go API and the existing session.

**Architecture:** Keep the existing Admin layout and data loader. Add the existing-contract PATCH method and a page-local native dialog. Re-fetch members only after a successful PATCH; never show an unconfirmed role. The Backend remains the authority for authorization and concurrent last-admin protection.

**Tech Stack:** React 19, React Router 6, native HTML dialog, existing CSS tokens, Jest/Testing Library, existing Playwright cache.

**Spec:** `ThaiFood_Admin_Role_Management_Codex.md`.

## Global constraints

- Modify only this Frontend repository, as the brief's final instruction specifies. Read the Backend contract without modifying its repository.
- Reuse `request`, JWT storage, AuthContext and route guards. No new roles, member deletion, password changes, dependencies or database edits.
- `PATCH /api/admin/members/{id}/role`, JSON `{ "role": "member" | "admin" }`, response: unwrapped public Member.
- Self-change is forbidden even for an unchanged role. Go enforces current DB role and last-admin safety; the Frontend displays its actual errors.
- Preserve the Modern Thai Editorial design and existing features. Keep QA credentials ignored and out of reports.
- The user canceled QA-account deletion. Do not perform it.
- This task prepares and verifies changes; do not extend the previous release request to automatically publishing this new feature.

## Review focus

- Slow/double submissions and Escape while saving must not create duplicate or uncertain writes.
- Failed PATCH or failed follow-up GET must not display an unconfirmed role or lose the ability to retry.
- Native dialog focus, keyboard containment, scroll, long names/emails and mobile widths must work in a real browser.
- A retained JWT must immediately gain/lose Admin access in test fixtures when the stored role changes.
- A stale Admin session or self-target must be rejected by the API; the UI must never claim that client checks enforce Backend security.

## Design decisions

Use a native modal dialog rather than a custom focus trap or `window.confirm`: it supports a labeled role selector, warning and feedback with browser focus containment. Use the existing loader's re-fetch rather than optimistic mutation. Keep the table and the page heading stable, restore focus to the trigger on cancellation and to the member-list heading after success. These are implementation choices within the supplied brief.

### Task 1: API contract and mock parity

**Files:** `thaifood/src/api/services.js`, `thaifood/src/api/fetch.test.js`, `thaifood/src/api/adminRoles.test.js`, `thaifood/src/mock/server.js`.

- [x] Add a failing transport test for the exact PATCH path, encoded ID, Bearer header, JSON body and unwrapped Member response.
- [x] Add failing mock integration tests for promotion/demotion, persistence, retained-token authorization, unchanged role, self/guest/member denial, invalid IDs/bodies and unknown members. Preserve Register/Profile role restrictions.
- [x] Implement the service and the mock route only; production continues using the real fetch transport.
- [x] Run the transport and role suites and record RED/GREEN evidence.

### Task 2: Member-directory interaction

**Files:** `thaifood/src/pages/admin/AdminMembers.jsx`, new `MemberRoleDialog.jsx`, new `AdminMembers.css`, new `AdminMembers.test.jsx`, existing `AdminUI.test.jsx`.

- [x] Add failing UI tests for opening the correct target, self-row explanation, selecting either role, warning, unchanged-role guard, double submit/loading, cancel/Escape/focus, error/retry and successful re-fetch.
- [x] Use `useAuth().member` for the self-row. Add only the requested management column and a page-local native modal.
- [x] Keep the draft and old row on failed mutation; focus error feedback and allow retry. Lock cancellation while the write is pending. On success close, announce, focus the list heading and reload real members.
- [x] Verify failed re-fetch offers the existing retry without inventing a role.
- [x] Update the obsolete read-only-directory assertion; preserve unrelated Admin tests and route guards.
- [x] Run focused suites, then full tests and production build.

### Task 3: Browser / live contract verification and handoff

**Files:** `docs/ADMIN_ROLE_MANAGEMENT.md`, scoped evidence under `docs/qa/admin-member-roles/`.

- [x] Verify the deployed Go route without changing unrelated accounts. Read the actual Backend contract and record what is or is not deployed.
- [x] Exercise native dialog keyboard, focus, pending/error/confirmation and responsive widths at 320/375/768/1024/1440, with fixtures isolated from real API requests.
- [x] If the real route is available, verify the new UI against the real API using a clearly identified existing QA member; restore its initial role in `finally` and verify restoration. Do not create or delete accounts. Completed 2026-11-14 after explicit user authorization: 12 checks / 35 real requests; original roles/count preserved.
- [x] Run axe on directory/dialog states and inspect screenshots. Do not persist real names, emails, credentials or tokens in authenticated artifacts.
- [x] Obtain one fresh read-only review; address material findings with regression tests and verify again as needed.
- [x] Document exact contract, changed files, tests/build, live verification, manual browser limits and any Backend work still required.

## Progress

- Repository baseline: `da2485136999ea8efcf47698ab447e8018a6e44f`, clean apart from the user-supplied brief.
- Existing Backend default-branch contract already contains this exact PATCH route and the self/last-admin error rules. No Backend source edits are assigned in this open repository.
- QA deletion was canceled before any SQL or data mutation.
- Task 1: complete — API RED22 failures → GREEN40 tests; production probe404 means live role tests must wait for Backend deployment.
- Task 2: complete — UI RED15+3 failures → GREEN34 focused tests; full suite254/23 passes, production build passes. Old Register test now explicitly expects400 for a role field and still exercises all its original valid registration/profile/password assertions.
- During execution HEAD advanced externally to `9bdb798` (API/mock/tests included). Preserve that commit and review cumulative changes from `da24851` plus the remaining working-tree UI; do not reset or re-commit it.
- Browser QA found an axe label-content warning in the unchanged mobile Header. Keep it outside this page-only implementation, record a baseline comparison, and explicitly scope this feature's axe checks to `.admin-content` including its dialog.
- Browser completion:15cases/6guards/33scoped axe scans passed, noJS/CORS/unexpected-request errors. Native chrome tab-stop handling corrected in QA; page-background inertness is explicitly verified.
- Fresh review: noCritical/Important issues. Deferred minor: short mobile viewport heights/internal scrolling remain unverified (all cases height1000px). Final build passes:JSmain.86983198.js, CSSmain.d937cd42.css; fresh suite254/23 passed.
- Rechecked live API:404 NOT_FOUND. Frontend is verified; real role/persistence acceptance awaits Backend deployment. Workspace/redeploy scope confirmation requested only after the Frontend result became concrete and reviewable.
- User confirmed "Frontend only first". Backend deployment and live role mutation remain explicitly outside this task. Frontend work complete with the documented minor coverage limit; preview3100 stopped and verified, no staged files/agent commits/pushes/deployments.
- 2026-11-14 scope extension: user explicitly requested real browser/Backend verification and supplied credentials for an existing QA member. Production Chromium QA passed 12 checks/35 requests: UI promotion/demotion + automatic re-fetch/reload/read-back, unchanged JWT member403→admin200→member403, member endpoints200, guest/invalid JWT401 and member/self403. Target ID12 restored to original Member in finally; all role mappings/member count unchanged, actor ID13 still Admin. Short mobile375×667 cancel/scroll reachability passed. No accounts created/deleted, no application/Backend changes, no local preview/commit/push/deploy. Last-admin/concurrency production mutation tests remain outside scope; no Go checks claimed. Reports: docs/qa/admin-member-roles/live-results.json and live.cjs.
- 2026-11-14 Backend verification explicitly authorized afterwards: inspected unchanged Backend main a8c0d78f76220f596a1646913685021ccfdc83f8 in /tmp with Go1.27.4 and disposable loopback-only PostgreSQL17.12. Full race run passed39top-level/90subtests, fail0/testskip0; three concurrency/lock-wait cases each repeated20times passed60more. Vet/build exit0. No test schemas left; owned container stopped/removed and absence independently confirmed by successful Docker listing. No Backend source edits, Production access, commit/push/deploy. LAST_ADMIN409 remains defensive handler-mock coverage; real DB proves self-change/actor-recheck/concurrent cross-demotion invariant. Separate-server and cancellation-while-waiting cases not added. Reports: docs/qa/admin-member-roles/backend/{results.json,README.md,audit.md}.
