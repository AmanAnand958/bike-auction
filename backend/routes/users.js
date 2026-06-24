const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware');

router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const userResult = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const bidsResult = await db.query(
      'SELECT id, amount, created_at, auction_id FROM bids WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const bids = [];
    for (const b of bidsResult.rows) {
      const auctionRes = await db.query(
        'SELECT id, title, status, current_bid, end_time FROM auctions WHERE id = $1',
        [b.auction_id]
      );
      
      if (auctionRes.rows.length > 0) {
        const auction = auctionRes.rows[0];
        
        const imgRes = await db.query(
          'SELECT url FROM auction_images WHERE auction_id = $1 ORDER BY display_order LIMIT 1',
          [auction.id]
        );
        const coverImage = imgRes.rows.length > 0 ? imgRes.rows[0].url : null;
        
        const isWinning = parseFloat(b.amount) === parseFloat(auction.current_bid);

        bids.push({
          id: b.id,
          amount: b.amount,
          created_at: b.created_at,
          auction_id: auction.id,
          title: auction.title,
          status: auction.status,
          current_bid: auction.current_bid,
          end_time: auction.end_time,
          cover_image: coverImage,
          is_winning: isWinning
        });
      }
    }

    user.bids = bids;

    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = router;
