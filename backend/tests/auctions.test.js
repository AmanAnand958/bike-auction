// auctions.test.js - Tests for listing and getting auctions

const request = require('supertest');
const app = require('../index');
const db = require('../db');

let adminToken;
let adminId;

beforeAll(async () => {
  // Create an admin user directly in DB (admins are set manually as per PRD)
  await db.query("DELETE FROM users WHERE email = 'admin@test.com'");
  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash('admin123', 10);
  const result = await db.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', 'admin@test.com', $1, 'admin') RETURNING id",
    [hash]
  );
  adminId = result.rows[0].id;

  // Get admin token
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'admin123' });
  adminToken = login.body.token;
});

afterAll(async () => {
  await db.query("DELETE FROM auctions WHERE created_by = $1", [adminId]);
  await db.query("DELETE FROM users WHERE email = 'admin@test.com'");
});

describe('GET /api/auctions', () => {
  it('should return list of auctions', async () => {
    const res = await request(app).get('/api/auctions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.auctions)).toBe(true);
  });

  it('should filter by status', async () => {
    const res = await request(app).get('/api/auctions?status=active');
    expect(res.status).toBe(200);
    // All returned auctions should be active
    res.body.auctions.forEach(a => expect(a.status).toBe('active'));
  });
});

describe('POST /api/auctions (admin)', () => {
  it('should create a new auction when admin', async () => {
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Admin Auction',
        year: 2021,
        make: 'Honda',
        model: 'CB350',
        mileage: 2000,
        condition: 'excellent',
        description: 'A test auction',
        starting_bid: 80000,
        start_time: new Date(Date.now() + 60000).toISOString(), // starts in 1 min
        end_time: new Date(Date.now() + 3600000).toISOString(), // ends in 1 hour
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Admin Auction');
  });

  it('should reject auction creation without admin role', async () => {
    // Register a regular user
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Regular', email: 'regular_auc@test.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({
        title: 'Unauthorized Auction',
        year: 2021,
        make: 'Honda',
        model: 'CB350',
        mileage: 2000,
        condition: 'good',
        starting_bid: 50000,
        start_time: new Date(Date.now() + 60000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res.status).toBe(403);

    await db.query("DELETE FROM users WHERE email = 'regular_auc@test.com'");
  });
});
