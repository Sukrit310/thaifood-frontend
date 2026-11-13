# ThaiFood Guide frontend design

The three root ThaiFood Guide v2 documents are the functional specification; API_CONTRACT_v2 is authoritative for endpoints and JSON. Build the requested frontend in this repository, reading MovieHub only as an architectural reference. Preserve the supplied documents.

## Approach and constraints

Use React 19, Create React App/react-scripts 5, React Router 6, Tailwind CSS 3, native fetch, Jest/React Testing Library. A shared request function switches between an in-browser contract mock and HTTP according to REACT_APP_USE_MOCK; an explicit false never falls back to mock. REACT_APP_API_URL is the server origin. This follows the user-provided implementation prompt; Vite and backend implementation are outside scope.

## Experience

Thai-first food discovery for guests and members. White surfaces, deep leaf green, crisp borders, Thai sans typography, and colorful food illustration/photo panels; compact navigation and generous readable content. Home has a search entry, destination links, and restaurant recommendations. List filters persist in URL, use Thai names, support all 77 provinces, and reset page on filter change. Detail includes website-computed 1–5 rating, reviews, favorites, location and data attribution. No reviews means null rating.

Members register, log in, update displayName, change password, save favorites and add/delete own reviews. AuthContext revalidates stored sessions through /api/me; guards wait for initialization and preserve the destination. Admin manages restaurants with provinceId/categoryId bodies, members and reviews. Moderation selects a restaurant and reads its public reviews because the contract has no global reviews endpoint. Dashboard uses existing restaurant/member endpoints. Delete restaurant requires confirmation.

Every remote view has loading, empty, error and retry states. Forms use controlled inputs and prevent duplicate submissions. Errors retain HTTP status/code; 401 invalidates the session, 403 displays forbidden without logout. Mock enforces owner/admin rules, uniqueness, rating and text constraints and derives rating aggregates. Mock data is fictional; demo credentials are public fixtures, not real secrets. No real credentials in source.

## Delivery

CRA commands npm start (port 3000), npm test, npm run build. Vercel SPA rewrites and environment guide. Real backend integration/deployment remain dependent on an actual Render URL; no placeholder is claimed as live. Verify Jest, production build and browser flows where available. Provide reference mapping, README, .env.example and integration checklist.
