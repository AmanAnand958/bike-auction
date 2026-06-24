-- Run this once to set up the database
-- psql -U youruser -d yourdbname -f schema.sql

-- Drop tables if they exist (for clean resets during dev)
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS auction_images CASCADE;
DROP TABLE IF EXISTS auctions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auctions table
CREATE TABLE auctions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  year INT NOT NULL,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  mileage INT NOT NULL,
  condition VARCHAR(20) NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  description TEXT,
  starting_bid DECIMAL(12, 2) NOT NULL,
  current_bid DECIMAL(12, 2),  -- null means no bids yet
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  winner_id INT REFERENCES users(id),
  created_by INT REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auction images (up to 5 per auction, stored as URLs)
CREATE TABLE auction_images (
  id SERIAL PRIMARY KEY,
  auction_id INT REFERENCES auctions(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0
);

-- Bids table
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  auction_id INT REFERENCES auctions(id) NOT NULL,
  user_id INT REFERENCES users(id) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index to speed up bid lookups by auction
CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_auctions_status ON auctions(status);
