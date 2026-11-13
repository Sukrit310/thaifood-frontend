# MovieHub → ThaiFood Guide reference audit and file mapping

Inspected read-only on 11 November 2026: [670710721/moviehub-670710721](https://github.com/670710721/moviehub-670710721), `main` tree `9a106da6737a1cc02159ae46464829a0067650ab`. The original repository was not changed. ThaiFood implementation belongs to this repository's `thaifood/` directory; paths below are relative to each application's root.

The implementation follows `ThaiFood_Guide_API_CONTRACT_v2.md`, `ThaiFood_Guide_FE_Codex_Prompt.md`, and `ThaiFood_Guide_Project_Brief_v2.md`. The contract takes precedence over reference endpoint names and payloads.

## Files read before implementation

- `README.md`, `package.json`, `src/App.jsx`
- `src/api/backend.js`, `src/auth/AuthContext.jsx`
- `src/components/ProtectedRoute.jsx`, `src/components/RequireRole.jsx`, `src/components/ReviewForm.jsx`
- `src/pages/Home.jsx`, `Movies.jsx`, `MovieDetail.jsx`, `Wishlist.jsx`
- `src/pages/admin/AdminDashboard.jsx`, `AdminLayout.jsx`, `AdminMembers.jsx`, `AdminMovies.jsx`, `AdminMovieForm.jsx`
- `src/api/backend.test.js`, `src/components/ProtectedRoute.test.jsx`, `ReviewForm.test.jsx`, `src/pages/Movies.test.jsx`, `src/setupTests.js`

The reference uses React 19, Create React App (`react-scripts` 5.0.1), React Router 6, Tailwind CSS 3, Jest, and React Testing Library. Retain that toolchain: `npm start` on port 3000, `npm test`, `npm run build`, and `process.env.REACT_APP_API_URL`.

## Mapping planned before source changes

| MovieHub reference | ThaiFood Guide target | Adaptation |
| --- | --- | --- |
| `src/App.jsx` | `src/App.jsx` | Public restaurant routes, member routes, nested admin routes, 404 |
| `src/pages/Home.jsx` | `src/pages/Home.jsx` | Restaurant discovery and province navigation; remove classroom roadmap and TMDB copy |
| `src/pages/Movies.jsx` | `src/pages/Restaurants.jsx` | API search, Thai province/category filters, pagination |
| `src/pages/MovieDetail.jsx` | `src/pages/RestaurantDetail.jsx` | Restaurant fields, 1–5 ratings, reviews, favorites |
| `src/components/MovieCard.jsx`, `MovieGrid.jsx` | `src/components/RestaurantCard.jsx`, `RestaurantGrid.jsx` | Food imagery/fallback, location, nullable rating, review count |
| `src/api/backend.js` | `src/api/backend.js` and service modules | Central JSON/Bearer/error/204 transport; exact contract v2 endpoints |
| `src/auth/AuthContext.jsx` | `src/auth/AuthContext.jsx` | ThaiFood storage keys, login/register/logout, current-member refresh, profile updates |
| `src/components/ProtectedRoute.jsx` | `src/components/ProtectedRoute.jsx` | Login redirect preserving destination; wait for session verification |
| `src/components/RequireRole.jsx` | `src/components/RequireRole.jsx` | Admin UI guard and 403 state; backend remains authority |
| `src/pages/Wishlist.jsx` | `src/pages/Favorites.jsx` | GET/POST/DELETE `/api/favorites`, remove favorite action |
| `src/components/ReviewForm.jsx`, `ReviewList.jsx` | Restaurant review components | Controlled rating and text, minimum 10 characters, duplicate conflict, owner/admin deletion |
| `src/pages/admin/AdminLayout.jsx` | `src/pages/admin/AdminLayout.jsx` | Nested dashboard/restaurants/reviews/members navigation |
| `src/pages/admin/AdminMovies.jsx` | `src/pages/admin/AdminRestaurants.jsx` | Searchable restaurant list and admin CRUD actions |
| `src/pages/admin/AdminMovieForm.jsx` | `src/pages/admin/AdminRestaurantForm.jsx` | Controlled restaurant form, numeric province/category IDs, coordinates, nullable image URL |
| `src/pages/admin/AdminDashboard.jsx` | `src/pages/admin/AdminDashboard.jsx` | Derive available summary from documented list APIs |
| `src/pages/admin/AdminMembers.jsx` | `src/pages/admin/AdminMembers.jsx` | Read-only member list; contract has no role-change endpoint |
| No equivalent | `src/pages/admin/AdminReviews.jsx` | Select restaurant and load its public reviews; delete through admin endpoint |
| No equivalent | `src/pages/Profile.jsx`, `ChangePassword.jsx` | GET/PATCH `/api/me`; PUT `/api/me/password` |
| `src/api/tmdb.js`, `src/data/data.js`, `mock/movies.json` | ThaiFood mock data and transport | Fictional restaurants, all 77 provinces, contract response envelopes; no TMDB dependency |
| `src/**/*.test.jsx`, `src/api/backend.test.js` | ThaiFood Jest/RTL suites | Test real user behavior, forms, loading/empty/error/retry, roles, API payloads/status handling |
| `vercel.json`, `.env.example` | `vercel.json`, `.env.example` | CRA build directory, SPA fallback, documented real/mock switch and Render URL |

## Patterns retained and corrections required

- Keep the reference's single API transport, `Authorization: Bearer …`, JSON serialization, nested React Router admin layout with `Outlet`, controlled inputs, and effect cleanup that prevents stale responses from replacing current data.
- Keep meaningful Jest assertions: API URL/method/header/body, no JSON parsing for 204, rejected API status, route output, and retry causing a fresh request.
- The reference filters all movies in memory. ThaiFood restaurant filtering must send `province`, `category`, `q`, `page`, `limit` to the API and retain the response's `items`, `page`, `limit`, `total` envelope. Province/category query values are Thai names; restaurant write payloads use numeric `provinceId`/`categoryId`.
- The reference API includes movie votes, `/api/admin/stats`, member-role updates, and admin movie detail. Contract v2 has no corresponding stats, role-update, or admin restaurant-detail GET endpoint. Do not invent them. Edit forms use public restaurant detail plus province/category lookups. Review moderation uses `GET /api/restaurants/{id}/reviews` and `DELETE /api/admin/reviews/{id}`.
- The reference caches a member using unguarded `JSON.parse` and treats a stored token as immediately logged in. Handle malformed storage and revalidate the token using `GET /api/me`; clear invalid sessions on 401. Never infer backend authorization from cached role.
- The reference detail silently converts failed reviews to an empty list. ThaiFood must expose review loading, error/retry, and genuine empty states separately.
- The reference review form only rejects empty text despite mentioning 10 characters. ThaiFood must enforce rating 1–5 and at least 10 text characters before submitting. One review per member/restaurant is enforced by mock/API with 409.
- Ratings must be computed from ThaiFood reviews; a restaurant without reviews has `rating: null`, `reviewCount: 0`. No imported Google/TMDB scores or invented review counts.
- Register returns a `Member`, so automatic sign-in requires a separate login request. Register must not accept an admin role. Logout clears the browser session; it does not revoke the backend JWT.
- Read no source `.env.local`, and copy no API keys or environment secrets. The reference README contains obsolete TMDB teaching instructions; replace product copy and deployment instructions with ThaiFood-specific content.

## Integration boundary

The mock and live transports expose the same contract. Default development may use mock data while the Go Render URL is unavailable. Switching to live mode must use Fetch and `REACT_APP_API_URL`, with no silent fallback to mock after a failed live request. Actual Go/Supabase integration, Render CORS, and Vercel production verification require the real backend/deployment URLs and must not be claimed from mock tests.
