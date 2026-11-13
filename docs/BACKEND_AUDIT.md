# Go backend compatibility audit

Read-only audit of [Sukrit310/thaifood-backend](https://github.com/Sukrit310/thaifood-backend), `main` commit `89f2ce2898717ae2649985f45d4034de18e12131`, on 11 November 2026 (Asia/Bangkok). No backend files or remote state were changed.

Inspected `handler/auth.go`, `handler/restaurants.go`, `handler/community.go`, `handler/handler.go`, `store/models.go`, `store/restaurants.go`, `store/reviews.go`, `store/favorites.go`, `mw/http.go`, `mw/auth.go`, `API_CONTRACT.md`, and `docs/FRONTEND_HANDOFF.md`.

## Runtime handoff

The backend handoff identifies `https://thaifood-guide-api-a7c7.onrender.com` as the deployed API. This audit reads repository source; it does not itself establish current service health or exercise live mutations.

CRA must build with this `REACT_APP_API_URL` and live transport enabled (`REACT_APP_USE_MOCK=false` in the current FE implementation). Restart development or rebuild/redeploy when changing either variable. The handoff says CORS currently allows `http://localhost:3000`; the actual Vercel origin must be added to Render's `ALLOWED_ORIGINS`. API requests need no cookies or `credentials: include`; the existing Bearer token and JSON headers match the backend.

## Necessary frontend adjustments

| Area | Actual Go behavior | Frontend adjustment |
| --- | --- | --- |
| Blank coordinates | Restaurant writes reject explicit `null` for every field except `imageUrl`; coordinates may both be omitted. Existing coordinates are preserved when omitted on PUT. | In `AdminRestaurantForm.jsx`, omit `latitude`/`longitude` when both inputs are blank. Send numeric values together otherwise. The current API cannot clear existing coordinates to null; avoid claiming that clearing the inputs removes saved coordinates. |
| Image URL | Must be an absolute HTTP/HTTPS URL with a host, without username/password, at most 2048 UTF-8 bytes; `imageUrl: null` clears the image. | Reject relative `/images/...` write values and update the image placeholder/help. Local illustration fallbacks may remain client-side. Align mock validation. |
| Passwords | Register/new password: 8–72 UTF-8 bytes. Login/current password: 1–72 bytes. Go uses byte length for bcrypt. | Share byte-length validation across Register, Login, ChangePassword and mock. JS string length or HTML `maxLength` alone is insufficient for Thai/emoji input. Do not trim passwords. |
| Password mismatch status | Wrong current password returns `401 INVALID_CREDENTIALS`; invalid/expired JWT returns `401 UNAUTHORIZED`. | Preserve the authenticated session for the password form's `INVALID_CREDENTIALS`; show the inline error. Expire the session for current-token authentication failures. Existing global all-401 logout would log out a member after mistyping the old password. Align mock, which currently returns 400 here. |
| Text limits | `displayName`: 1–100 Unicode code points; restaurant name/address/description: 1–200/1–1000/1–5000; review text: 10–5000. Trim surrounding whitespace; reject NUL characters. | Align UI and mock limits and count code points (`Array.from(value).length`) where validating text. The original mock limits 80, 150/500/3000, and review 3000 differ from the actual server. |
| Search limits | `q` max 200 code points; province/category max 100; only `page`, `limit`, `province`, `category`, `q` allowed, each once. | Limit or validate search input. Continue building service query params explicitly rather than forwarding arbitrary URL parameters. |

Primary implementation references: [restaurant validation](https://github.com/Sukrit310/thaifood-backend/blob/89f2ce2898717ae2649985f45d4034de18e12131/handler/restaurants.go#L87), [auth validation/status](https://github.com/Sukrit310/thaifood-backend/blob/89f2ce2898717ae2649985f45d4034de18e12131/handler/auth.go#L20), [text/password length helpers](https://github.com/Sukrit310/thaifood-backend/blob/89f2ce2898717ae2649985f45d4034de18e12131/handler/handler.go#L142), [review validation](https://github.com/Sukrit310/thaifood-backend/blob/89f2ce2898717ae2649985f45d4034de18e12131/handler/community.go#L24).

## Compatible behavior to retain

- Existing service paths/methods and camelCase JSON match all documented backend routes. Restaurant list includes `{ items, page, limit, total }`; other lists return `{ items }`; empty arrays are never null.
- Register returns 201 and a Member, without automatically logging in. Login returns `{ token, member }`. Member JSON never includes `passwordHash`.
- Reviews use integer rating 1–5 and nested `{ member: { id, displayName } }`; duplicate review/favorite/email returns generic `409 CONFLICT`. Handle by HTTP status; do not depend exclusively on mock-specific conflict codes.
- Delete operations and successful password changes return 204 with no body. Continue checking 204 before parsing JSON.
- No admin stats, role-change, admin restaurant GET, or all-reviews GET route exists. Existing public restaurant detail, paginated lists, member list, and per-restaurant review moderation fit the backend.
- JWT lifetime is one hour; logout only clears the browser session. Backend reloads the member/role from its database for every protected request.
- Restaurants without reviews return `rating: null`, `reviewCount: 0`; images/coordinates can be null in responses. Existing UI fallbacks and nullable-rating display are compatible.
- The handoff explicitly identifies the initial 25 restaurants as fictional demonstration data. Live mode should continue communicating that the seeded restaurant content is fictional.

## Mock fidelity details

For reliable integration tests, also align smaller differences when touching the mock: the Go list endpoint clamps `limit > 50` to 50, validates page/limit at a maximum of 1,000,000,000, returns 404 when deleting a nonexistent favorite, rejects unknown body fields, and uses generic `CONFLICT` for duplicate records. These do not require endpoint or JSON field changes.

The source contract remains `API_CONTRACT.md` in the backend repository. The validation rules above document observed implementation details; no endpoint/field names were changed by this audit.
