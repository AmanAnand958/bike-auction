// bids.test.js - Tests for placing bids and validation rules

const request = require('supertest');
const app = require('../index');
const db = require('../db');

let userToken;
let userId;
let auctionId;

// Set up a user and an active auction before tests
beforeAll(async () => {
  // Clean up
  await db.query("DELETE FROM bids WHERE auction_id IN (SELECT id FROM auctions WHERE title = 'Test Bike Auction')");
  await db.query("DELETE FROM auctions WHERE title = 'Test Bike Auction'");
  await db.query("DELETE FROM users WHERE email = 'bidder@test.com'");

  // Register a test user
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Bidder', email: 'bidder@test.com', password: 'password123' });

  userToken = reg.body.token;
  userId = reg.body.user.id;

  // Create an active auction directly in DB
  const auction = await db.query(
    `INSERT INTO auctions 
      (title, year, make, model, mileage, condition, starting_bid, status, start_time, end_time, created_by)
     VALUES ('Test Bike Auction', 2020, 'Royal Enfield', 'Classic 350', 5000, 'good', 50000, 'active', NOW() - interval '1 hour', NOW() + interval '1 day', $1)
     RETURNING id`,
    [userId]
  );
  auctionId = auction.rows[0].id;
});

afterAll(async () => {
  await db.query(`DELETE FROM bids WHERE auction_id = ${auctionId}`);
  await db.query(`DELETE FROM auctions WHERE id = ${auctionId}`);
  await db.query("DELETE FROM users WHERE email = 'bidder@test.com'");
});

describe('POST /api/auctions/:id/bids', () => {
  it('should place a valid bid', async () => {
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 55000 });

    expect(res.status).toBe(201);
    expect(res.body.new_current_bid).toBe(55000);
  });

  it('should reject bid lower than current bid', async () => {
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 40000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/higher than/i);
  });

  it('should reject bid equal to current bid', async () => {
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 55000 });

    // User is already highest bidder
    expect(res.status).toBe(400);
  });

  it('should reject bid without auth', async () => {
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .send({ amount: 60000 });

    expect(res.status).toBe(401);
  });

  it('should reject bid on ended auction', async () => {
    // Create an ended auction
    const ended = await db.query(
      `INSERT INTO auctions 
        (title, year, make, model, mileage, condition, starting_bid, status, start_time, end_time, created_by)
       VALUES ('Ended Auction', 2019, 'Bajaj', 'Pulsar', 3000, 'fair', 20000, 'ended', NOW() - interval '2 days', NOW() - interval '1 day', $1)
       RETURNING id`,
      [userId]
    );

    const res = await request(app)
      .post(`/api/auctions/${ended.rows[0].id}/bids`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 25000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not active/i);

    await db.query(`DELETE FROM auctions WHERE id = ${ended.rows[0].id}`);
  });
});

describe('GET /api/auctions/:id/bids', () => {
  it('should return bid history for an auction', async () => {
    const res = await request(app).get(`/api/auctions/${auctionId}/bids`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bids)).toBe(true);
    expect(res.body.bids.length).toBeGreaterThan(0);
  });
});
