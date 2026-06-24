# Setup Instructions

## Prerequisites

Make sure you have these installed before starting:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **PostgreSQL** v14 or higher — [postgresql.org](https://www.postgresql.org/download/)
- **npm** (comes with Node.js)
- **Git** (to clone the repo)

Check your versions:
```bash
node -v        # should be v18+
npm -v         # should be 8+
psql --version # should be 14+
```

---

## Step 1 — Get the Code

```bash
git clone <your-repo-url>
cd bike-auction
```

Or if you already have the folder, just `cd` into it.

---

## Step 2 — Set Up the Database

### 2a. Create the database

Open a terminal and run:

```bash
# Create the database
createdb bike_auction

# Or if you need to specify a user:
createdb -U postgres bike_auction
```

If `createdb` isn't in your PATH, use psql directly:
```bash
psql -U postgres -c "CREATE DATABASE bike_auction;"
```

### 2b. Run the schema

This creates all the tables (users, auctions, auction_images, bids):

```bash
psql -U postgres -d bike_auction -f backend/schema.sql
```

Expected output:
```
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
```

---

## Step 3 — Set Up the Backend

```bash
cd backend
npm install
```

Create your `.env` file:
```bash
cp .env.example .env
```

Open `.env` and fill in your values:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bike_auction
JWT_SECRET=pick_any_long_random_string_here
PORT=5000
FRONTEND_URL=http://localhost:5173
```

> **Tip:** For `JWT_SECRET`, just type anything long and random — it's only used to sign tokens locally.

Start the backend:
```bash
npm start
```

You should see:
```
Connected to PostgreSQL
Cron jobs started - checking auction status every minute
Server running on http://localhost:5000
```

Test it's working:
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok","time":"..."}
```

---

## Step 4 — Set Up the Frontend

Open a **new terminal window** (keep the backend running):

```bash
cd frontend
npm install
npm run dev
```

You should see:
```
  VITE v8.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
```

Open your browser at **http://localhost:5173** — the app should load.

---

## Step 5 — Create or Use an Admin Account

### Option A: Use Seed Credentials (Recommended)
If you populated the database using the seeder script, you can log in directly using these pre-seeded test accounts:
* **Admin Account**:
  * **Email**: `admin@bikeauction.com`
  * **Password**: `admin123`
* **Regular Users**:
  * **Email**: `rohit@gmail.com`, `priya@gmail.com`, or `amit@gmail.com`
  * **Password**: `user123`

### Option B: Create a New Admin Account Manually
1. Register a new account on the website.
2. Then run this SQL to promote it to an admin:

```bash
psql -U postgres -d bike_auction
```

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

3. **Log out and log back in** — this is important because the JWT token still has the old role. After re-logging in, you'll see the "Admin" link in the navbar.

---

## Step 6 — Load Some Sample Data (Optional)

To quickly test the app with some auctions, you can run this in psql:

```sql
-- First, get your admin user's ID
SELECT id FROM users WHERE role = 'admin';

-- Then insert sample auctions (replace 1 with your actual admin id)
INSERT INTO auctions (title, year, make, model, mileage, condition, description, starting_bid, status, start_time, end_time, created_by)
VALUES
  ('2021 Royal Enfield Classic 350', 2021, 'Royal Enfield', 'Classic 350', 8500, 'excellent', 'Single owner, well maintained, all service records available.', 95000, 'active', NOW() - interval '2 hours', NOW() + interval '2 days', 1),
  ('2019 Bajaj Dominar 400', 2019, 'Bajaj', 'Dominar 400', 22000, 'good', 'Minor scratches on tank, engine in perfect condition.', 75000, 'active', NOW() - interval '1 hour', NOW() + interval '1 day', 1),
  ('2020 KTM Duke 390', 2020, 'KTM', 'Duke 390', 15000, 'good', 'Sporty commuter, all original parts, 1 owner.', 145000, 'upcoming', NOW() + interval '1 day', NOW() + interval '4 days', 1),
  ('2018 Honda CB Shine', 2018, 'Honda', 'CB Shine', 35000, 'fair', 'Daily rider, needs minor servicing. Selling as-is.', 28000, 'ended', NOW() - interval '3 days', NOW() - interval '1 day', 1);
```

---

## Running Tests

Make sure the backend `.env` is configured and the DB is running, then:

```bash
cd backend
npm test
```

Tests run sequentially (`--runInBand`) to avoid race conditions. They clean up after themselves — no leftover data.

Expected output:
```
PASS tests/auth.test.js
PASS tests/auctions.test.js
PASS tests/bids.test.js

Test Suites: 3 passed, 3 total
Tests:       13 passed, 13 total
```

---

## Common Issues

**"Connection refused" when starting backend**
→ Make sure PostgreSQL is running. On Mac: `brew services start postgresql`

**"password authentication failed"**
→ Check your `DATABASE_URL` in `.env`. Make sure the username/password match your local PostgreSQL setup.

**"relation does not exist"**
→ You probably forgot to run `schema.sql`. Run Step 2b again.

**Port 5000 already in use**
→ Change `PORT=5001` in your `.env` and update `vite.config.js` proxy target to match.

**Frontend shows "Failed to load auctions"**
→ Backend isn't running. Start it with `npm start` in the `backend/` folder.

---

## Optional: Image Uploads (Cloudinary)

By default, admins paste image URLs. To enable file uploads:

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier is more than enough)
2. Go to your Cloudinary dashboard and copy your Cloud Name, API Key, and API Secret
3. Add to your backend `.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
4. Restart the backend — the "Upload File" button in the auction create/edit form will now work

---

## Optional: Email Notifications

When configured, the system sends "You've been outbid" and "You've won" emails automatically.

### Gmail setup:
1. Enable 2-Step Verification on your Google account
2. Go to **Google Account → Security → App Passwords**
3. Create an App Password for "Mail"
4. Add to your backend `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=you@gmail.com
EMAIL_PASS=xxxx_xxxx_xxxx_xxxx   # your 16-char App Password
EMAIL_FROM="Bike Auction" <you@gmail.com>
```
5. Restart the backend

If `EMAIL_HOST` is not set, emails are silently skipped — the bidding still works normally.

---

## Optional: Separate Test Database

By default, `npm test` runs against your main dev database. To avoid mixing test data:

```bash
# Create the test database
createdb bike_auction_test

# Run the schema on it
psql -U postgres -d bike_auction_test -f backend/schema_test.sql
```

Then add to your backend `.env`:
```env
TEST_DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bike_auction_test
```

Now `npm test` will use the test database and leave your dev data untouched.

---

## Optional: Min Bid Increment

The minimum amount a bid must exceed the current bid is configurable:

```env
MIN_BID_INCREMENT=500   # default: ₹500
```

Change this in your `.env` and restart the backend.

