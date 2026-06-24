# Assumptions & Trade-offs

This document explains the design decisions made during implementation, what was assumed about requirements, and what was deliberately kept simple or deferred.

---

## Assumptions

### About Users
- Users are assumed to be honest about their identity — no email verification is required
- A user can only have one role: either `user` or `admin`. No superadmin concept needed
- Users don't need to update their profile or change their password (out of scope for a demo)

### About Auctions
- Auction titles are manually written by admins (e.g. "2019 Royal Enfield Classic 350"). The `title` field is free text
- An auction's `current_bid` is always the most recent highest bid. There's no reserve price — any bid above the starting bid counts
- If an auction ends with zero bids, there is no winner (`winner_id` stays null)
- Admins are trusted — there's no approval workflow for creating auctions

### About Bids
- Bids are final. Once placed, a bid cannot be withdrawn or modified
- All bid amounts are in Indian Rupees (₹). No multi-currency support
- Decimal precision is 2 places (like ₹95,000.50)
- **Profile Page Aggregation (Compaction)**: In the "My Bids" dashboard, multiple bids placed on the same auction are compacted so that only the user's highest bid is displayed per auction. The statistics panel still displays the total count of all bid attempts.

### About Images
- Images are stored as URLs pointing to external hosting (e.g. a direct image link, Cloudinary, Imgur)
- No actual file uploads. The admin pastes a URL into the form
- Up to 5 images per auction. The first one is the cover photo

### About Time
- All times are stored in UTC in the database
- The frontend displays times in the user's local timezone (JavaScript's `Date` handles this automatically)
- The cron job runs every minute, so status transitions can be up to 60 seconds late — acceptable

---

## Trade-offs

### 1. WebSockets vs Polling

**Decision:** WebSockets (via Socket.io) for real-time bid updates.

**Why WebSockets?**
We implemented Socket.io to ensure a premium real-time bidding experience. Bids placed by any user are immediately broadcast to all active viewers of the auction page. This prevents the latency associated with polling (which could cause out-of-sync bidding states during critical final seconds) and avoids hammering the database with frequent HTTP polling requests.

**Trade-off:** Adds slightly more connection management complexity to the backend and frontend compared to simple polling, but is fully justified for a competitive live bidding platform.

---

### 2. JWT in localStorage vs httpOnly Cookies

**Decision:** JWT stored in `localStorage`, sent as `Authorization: Bearer <token>`.

**Why not httpOnly cookies?**
Cookies require CSRF protection (adding another middleware and token), and make the frontend more complex — you lose the ability to simply read the token in JavaScript. For a demo project with no real financial transactions, localStorage is fine.

**Trade-off:** localStorage is vulnerable to XSS attacks. In a production system handling real money, httpOnly cookies would be the right choice.

---

### 3. Images as URLs vs File Uploads

**Decision:** Admins enter image URLs; no actual file upload.

**Why not file uploads?**
Handling uploads requires: storing files on disk (won't work on Render without a persistent volume) or integrating Cloudinary/S3 (adds 3rd party setup and API keys). URL inputs work for demo purposes.

**Trade-off:** Admin needs to host images elsewhere (Cloudinary free tier, Imgur, etc.) and paste the URL. Not the smoothest UX, but keeps setup to zero dependencies.

---

### 4. Admin Accounts Set Manually in DB

**Decision:** There's no admin registration page. Admins are promoted via a direct SQL update.

**Why?**
An admin self-registration flow would either be insecure (anyone can become admin) or require an invitation system (complex). For an internship demo, manually setting `role = 'admin'` in psql is the practical approach.

**Trade-off:** Not user-friendly, but safe and simple.

---

### 5. No Pagination

**Decision:** All auctions and bids are returned in a single query. No pagination.

**Why?**
For a demo handling maybe 20-50 auctions and a few hundred bids, pagination adds complexity without visible benefit. The queries are fast at this scale.

**Trade-off:** Would not scale to thousands of auctions. A real production system would need `LIMIT` and `OFFSET` or cursor-based pagination.

---

### 6. No Email Notifications

**Decision:** No emails sent when you're outbid, when an auction ends, or when you win.

**Why?**
The PRD explicitly says this is out of scope. Setting up SMTP or SendGrid for transactional email is unnecessary for an internship demo.

**Trade-off:** Users have to manually check the site to know if they've been outbid.

---

### 7. `current_bid` Denormalized on the Auction Row

**Decision:** The `auctions` table has a `current_bid` column that's updated every time a bid is placed, even though `current_bid` could always be computed from `MAX(bids.amount)`.

**Why?**
Avoids running a `MAX()` subquery on the bids table every time we list auctions (which happens on the home page). The home page would otherwise need a subquery per auction, which is slower.

**Trade-off:** Data is duplicated — `current_bid` in `auctions` must be kept in sync with the bids table. If someone directly inserts a bid in the DB, `current_bid` won't update. Acceptable for this project since bids only go through the API.

---

### 8. No Input Sanitization Beyond Parameterized Queries

**Decision:** Parameterized queries (via `pg`) protect against SQL injection. No HTML sanitization or additional validation library used.

**Why?**
The API returns JSON, not HTML, so XSS via stored content is mostly mitigated by React's automatic escaping. Parameterized queries are the most important SQL injection protection. Adding a library like `validator.js` for email/URL format checking would be a good addition but isn't critical for the scope.

**Trade-off:** Malformed data (very long strings, weird Unicode) could cause display issues. A production app would add length limits and stricter validation.

---

### 9. Tests Use the Same Database as Development

**Decision:** Tests run against the same PostgreSQL DB defined in `.env`, not a separate test database.

**Why?**
Setting up a separate test DB requires extra configuration. Tests clean up after themselves (delete test data in `afterAll`), so they don't pollute the dev DB permanently.

**Trade-off:** If tests fail mid-run (e.g. server crash), test data might be left behind. Also means you can't run tests and dev simultaneously without race conditions — hence `--runInBand` in the Jest config.

---

### 10. Single Server Process

**Decision:** One `node index.js` process handles everything: API routes, cron job, all users.

**Why?**
For ~50 concurrent users (per the PRD's NFR), a single Node.js process is more than enough. Splitting into separate services (API server + cron worker) adds deployment complexity for no practical benefit at this scale.

**Trade-off:** If the server crashes, the cron job stops too. On a real system, you'd run the cron as a separate worker. For this project, the cron is just a convenience — admins can always manually close auctions via the dashboard.

---

## What's Now Implemented vs Still Deferred

| Area | This Project (now) | Still Deferred |
|---|---|---|
| **Real-time** | Socket.io (instant bid push) | — |
| **Auth token storage** | JWT in localStorage | httpOnly cookies + CSRF tokens |
| **Images** | File upload via Cloudinary (optional) + URL paste | — |
| **Cron** | Single server + cron (no separate worker) | BullMQ/Redis worker queue |
| **Pagination** | Not implemented (loads all items at once) | Cursor-based pagination on list endpoints |
| **Email** | Not implemented (as per PRD scope) | Transactional outbid/win email notifications |
| **Tests** | Uses dev DB directly (runs sequentially) | Separate, isolated test database support |
| **Rate limiting** | Disabled/Mock pass-through middleware | Brute-force/spam rate-limiter setup |
| **Bid race conditions** | Standard INSERT/UPDATE queries | PostgreSQL transactions (`BEGIN/COMMIT`) + `SELECT FOR UPDATE` locking |
| **Input validation** | Zod schemas (type, length, presence validation) | Third-party sanitization library |
| **Min increment** | Configurable MIN_BID_INCREMENT env var (default ₹500) | Dynamic tiered increment rules |
| **Caching** | Not implemented | Redis caching layer for read endpoints |

