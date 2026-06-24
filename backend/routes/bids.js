const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { requireAuth } = require('../middleware');
const { placeBidSchema, formatZodError } = require('../validation');

const MIN_INCREMENT = parseFloat(process.env.MIN_BID_INCREMENT || '500');

router.get('/', async (req, res) => {
  const { id } = req.params;

  try {
    const bidsResult = await db.query(
      `SELECT id, amount, created_at, user_id
       FROM bids
       WHERE auction_id = $1
       ORDER BY amount DESC`,
      [id]
    );

    const bids = [];
    for (const row of bidsResult.rows) {
      const userResult = await db.query(
        'SELECT name FROM users WHERE id = $1',
        [row.user_id]
      );
      const userName = userResult.rows[0] ? userResult.rows[0].name : 'Unknown User';
      bids.push({
        id: row.id,
        amount: row.amount,
        created_at: row.created_at,
        user_name: userName
      });
    }

    res.json({
      bids,
    });
  } catch (err) {
    console.error('Get bids error:', err);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = placeBidSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: formatZodError(result.error) });
  }

  const bidAmount = result.data.amount;

  try {
    const auctionResult = await db.query(
      'SELECT id, status, starting_bid, current_bid, title FROM auctions WHERE id = $1',
      [id]
    );

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const auction = auctionResult.rows[0];

    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    const currentTop = auction.current_bid ? parseFloat(auction.current_bid) : parseFloat(auction.starting_bid);
    const minValidBid = currentTop + MIN_INCREMENT;

    if (bidAmount < minValidBid) {
      return res.status(400).json({
        error: `Bid must be higher than the current bid: at least ₹${minValidBid.toLocaleString('en-IN')} (current + ₹${MIN_INCREMENT.toLocaleString('en-IN')} minimum increment)`,
        current_bid: currentTop,
        min_bid: minValidBid,
        min_increment: MIN_INCREMENT,
      });
    }

    const prevTopBid = await db.query(
      'SELECT user_id FROM bids WHERE auction_id = $1 ORDER BY amount DESC LIMIT 1',
      [id]
    );

    const prevHighBidder = prevTopBid.rows[0] || null;

    if (prevHighBidder && prevHighBidder.user_id === userId) {
      return res.status(400).json({ error: "You're already the highest bidder" });
    }

    await db.query(
      'INSERT INTO bids (auction_id, user_id, amount) VALUES ($1, $2, $3)',
      [id, userId, bidAmount]
    );

    await db.query(
      'UPDATE auctions SET current_bid = $1 WHERE id = $2',
      [bidAmount, id]
    );

    console.log(`[BID] auction_id=${id} user_id=${userId} amount=${bidAmount}`);

    const io = req.app.get('io');
    if (io) {
      io.to(`auction_${id}`).emit('new_bid', {
        auction_id: id,
        new_current_bid: bidAmount,
        user_name: req.user.email.split('@')[0],
      });
    }

    res.status(201).json({
      message: 'Bid placed successfully',
      new_current_bid: bidAmount,
      min_increment: MIN_INCREMENT,
    });
  } catch (err) {
    console.error('Place bid error:', err);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

module.exports = router;
