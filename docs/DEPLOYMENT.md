# Deployment Instructions

This guide covers deploying the app for free using:
- **Render.com** — backend + PostgreSQL
- **Vercel** — frontend

Both have free tiers that work fine for this project.

---

## Prerequisites

- Code pushed to a GitHub repository
- Accounts on [render.com](https://render.com) and [vercel.com](https://vercel.com)

---

## Step 1 — Push to GitHub

If you haven't already:

```bash
cd bike-auction
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/bike-auction.git
git push -u origin main
```

Make sure `.gitignore` is working — `node_modules/` and `.env` should NOT be pushed.

---

## Step 2 — Deploy Database on Render

1. Go to [render.com](https://render.com) and sign up / log in
2. Click **New → PostgreSQL**
3. Fill in:
   - **Name:** `bike-auction-db`
   - **Database:** `bike_auction`
   - **User:** leave default
   - **Region:** pick the closest to you
   - **Plan:** Free
4. Click **Create Database**
5. Wait a minute for it to spin up
6. Copy the **Internal Database URL** — you'll need it in Step 3

> **Note:** On the free tier, the database sleeps after 90 days of inactivity. Fine for an internship demo.

### Run the Schema on Production DB

Once the DB is created, go to the "Shell" tab on Render and run:

```sql
-- Paste the contents of schema.sql here, or connect via psql:
psql <your-internal-database-url> -f schema.sql
```

Or connect from your local machine using the **External Database URL**:
```bash
psql "postgresql://..." -f backend/schema.sql
```

---

## Step 3 — Deploy Backend on Render

1. Click **New → Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `bike-auction-backend`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Add **Environment Variables** (click "Add Environment Variable" for each):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Paste the Internal Database URL from Step 2 |
| `JWT_SECRET` | Any long random string (e.g. `xk92mQp3vNs7bYr1`) |
| `PORT` | `5000` |
| `FRONTEND_URL` | (set this after Step 4 — paste your Vercel URL) |

5. Click **Deploy**
6. Wait ~2 minutes. Once it says "Live", copy the service URL — looks like `https://bike-auction-backend.onrender.com`

> **Note:** Free Render instances spin down after 15 minutes of inactivity and take ~30 seconds to wake up on the next request. That's fine for a demo.

---

## Step 4 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up / log in
2. Click **Add New → Project**
3. Import your GitHub repo
4. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add **Environment Variable:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://bike-auction-backend.onrender.com/api` |

6. Click **Deploy**
7. Vercel gives you a URL like `https://bike-auction.vercel.app`

---

## Step 5 — Update CORS on Backend

Now that you have the Vercel URL, go back to Render and update the environment variable:

```
FRONTEND_URL = https://bike-auction.vercel.app
```

Click **Save Changes** — Render will redeploy automatically.

---

## Step 6 — Create Admin Account on Production

1. Register an account on your live site
2. Connect to the production DB from your local machine using the External DB URL:

```bash
psql "postgresql://user:pass@host/bike_auction"
```

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

3. Log out and log back in on the live site.

---

## Verifying the Deployment

Test these URLs after deploying:

```bash
# Backend health check
curl https://bike-auction-backend.onrender.com/api/health
# Expected: {"status":"ok","time":"..."}

# Auctions list
curl https://bike-auction-backend.onrender.com/api/auctions
# Expected: [] (empty array if no auctions yet)
```

Frontend: open your Vercel URL in the browser and try:
- Register an account
- Browse auctions (empty is fine)
- Log in as admin and create an auction

---

## Environment Variables Summary

### Backend (Render)
```
DATABASE_URL   = postgresql://...  (from Render PostgreSQL)
JWT_SECRET     = <your-secret>
PORT           = 5000
FRONTEND_URL   = https://your-app.vercel.app
```

### Frontend (Vercel)
```
VITE_API_URL   = https://your-backend.onrender.com/api
```

---

## Estimated Deploy Time

| Step | Time |
|------|------|
| Push to GitHub | 2 min |
| Set up Render DB | 3 min |
| Run schema | 1 min |
| Deploy backend | 3-5 min |
| Deploy frontend | 2-3 min |
| **Total** | **~15 min** |

---

## Alternative: Run Everything Locally with a .env File

If you just want to demo it locally (no deployment), see [SETUP.md](./SETUP.md).
