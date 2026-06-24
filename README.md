# Bike Auction Platform 🏍️

This is my MTech internship assignment — a web platform where users can bid on used motorcycles in live auctions. Admins can create and manage auctions. Built over a weekend, kept simple on purpose.

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP.md](./docs/SETUP.md) | Local development setup from scratch |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, DB schema, API design |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Deploy to Render + Vercel (free) |
| [ASSUMPTIONS.md](./docs/ASSUMPTIONS.md) | Design decisions and trade-offs |
| [IMPROVEMENTS.md](./docs/IMPROVEMENTS.md) | Future improvements and scaling roadmap |

---

## What it does

- Users can register, log in, and place bids on active bike auctions
- Bids update instantly in real-time via Socket.io WebSockets
- Admins can create, edit, and close auctions
- Auction status changes automatically via a background job (upcoming → active → ended)
- Simple countdown timers on every auction

## Tech Stack

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: React + Vite (plain JS) + Socket.io-client
- **Database**: PostgreSQL
- **Auth**: JWT tokens stored in localStorage
- **Real-time updates**: Socket.io WebSockets (port 5001)

## Default Seed Credentials

If you ran `npm run seed` (or the database seeder), you can log in with:
* **Admin User**:
  * Email: `admin@bikeauction.com`
  * Password: `admin123`
* **Regular Users**:
  * Email: `rohit@gmail.com`, `priya@gmail.com`, or `amit@gmail.com`
  * Password: `user123`

## Folder Structure

```
bike-auction/
├── backend/       ← Express server
│   ├── routes/    ← auth, auctions, bids, users
│   ├── tests/     ← Jest + supertest integration tests
│   ├── index.js   ← server entry point
│   ├── db.js      ← pg connection pool
│   ├── middleware.js ← JWT auth
│   ├── cron.js    ← auto-closes expired auctions
│   └── schema.sql ← run once to set up DB tables
│
└── frontend/      ← React app
    └── src/
        ├── pages/ ← Home, AuctionDetail, Login, Register, Profile, Admin pages
        ├── components/ ← Navbar, AuctionCard, CountdownTimer
        └── api.js ← all backend calls in one file
```

## Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL running locally

### 1. Set up the database

```bash
# Create a database (run in psql)
createdb bike_auction

# Run the schema to create tables
psql -U postgres -d bike_auction -f backend/schema.sql
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, etc. in .env
npm start
```

Backend runs on http://localhost:5000

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### 4. Create your first admin

After registering a user, manually set their role in the DB:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Then log out and log back in (token needs to refresh with new role).

## Running Tests

```bash
cd backend
npm test
```

There are ~13 integration tests covering auth, auctions, and bids.

**Note:** Tests need a running PostgreSQL database (uses the same one from `.env`). Tests clean up after themselves.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, get JWT |
| GET | /api/auctions | No | List auctions (filter by ?status=) |
| GET | /api/auctions/:id | No | Auction detail + bids |
| POST | /api/auctions | Admin | Create auction |
| PUT | /api/auctions/:id | Admin | Edit auction (upcoming only) |
| POST | /api/auctions/:id/close | Admin | Manually close auction |
| POST | /api/auctions/:id/bids | User | Place a bid |
| GET | /api/auctions/:id/bids | No | Get bid history |
| GET | /api/users/me | User | My profile + bid history |

## Deploying (Render + Vercel)

1. Push to GitHub
2. Deploy backend on [Render.com](https://render.com) — add environment variables
3. Use Render's managed PostgreSQL for the database
4. Deploy frontend on [Vercel](https://vercel.com) — set `VITE_API_URL` to your Render backend URL
5. Run the schema.sql against your production database once

## Notes / Trade-offs

- Images are stored as URLs, not actual file uploads (simpler setup)
- No email verification on register
- Admin accounts are set manually in the DB (no self-service admin registration)
- JWT stored in localStorage — fine for this project, not ideal for production

## What I would add with more time

- Email notifications when you're outbid
- Image upload (Cloudinary integration)
- Better mobile responsiveness
- Pagination for bid history on popular auctions
