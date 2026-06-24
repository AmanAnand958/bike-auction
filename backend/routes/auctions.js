const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware');
const { auctionSchema, updateAuctionSchema, formatZodError } = require('../validation');

router.get('/', async (req, res) => {
  const { status, search } = req.query;

  let query = 'SELECT * FROM auctions WHERE 1=1';
  const params = [];

  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (title ILIKE $${params.length} OR make ILIKE $${params.length} OR model ILIKE $${params.length})`;
  }

  query += ' ORDER BY created_at DESC';

  try {
    const dataResult = await db.query(query, params);
    const auctions = dataResult.rows;

    for (let a of auctions) {
      const imgRes = await db.query('SELECT url FROM auction_images WHERE auction_id = $1 ORDER BY display_order LIMIT 1', [a.id]);
      a.cover_image = imgRes.rows.length > 0 ? imgRes.rows[0].url : null;

      const bidRes = await db.query('SELECT COUNT(*) FROM bids WHERE auction_id = $1', [a.id]);
      a.bid_count = parseInt(bidRes.rows[0].count);

      if (a.winner_id) {
        const winRes = await db.query('SELECT name FROM users WHERE id = $1', [a.winner_id]);
        a.winner_name = winRes.rows.length > 0 ? winRes.rows[0].name : null;
      } else {
        a.winner_name = null;
      }
    }

    res.json({
      auctions,
    });
  } catch (err) {
    console.error('Get auctions error:', err);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const auctionResult = await db.query(
      'SELECT * FROM auctions WHERE id = $1',
      [id]
    );

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const auction = auctionResult.rows[0];

    const creatorRes = await db.query('SELECT name FROM users WHERE id = $1', [auction.created_by]);
    auction.created_by_name = creatorRes.rows.length > 0 ? creatorRes.rows[0].name : null;

    if (auction.winner_id) {
      const winnerRes = await db.query('SELECT name FROM users WHERE id = $1', [auction.winner_id]);
      auction.winner_name = winnerRes.rows.length > 0 ? winnerRes.rows[0].name : null;
    } else {
      auction.winner_name = null;
    }

    const imagesResult = await db.query(
      'SELECT id, url, display_order FROM auction_images WHERE auction_id = $1 ORDER BY display_order',
      [id]
    );

    const bidsResult = await db.query(
      'SELECT id, amount, user_id, created_at FROM bids WHERE auction_id = $1 ORDER BY amount DESC LIMIT 5',
      [id]
    );

    const bids = bidsResult.rows;
    for (let b of bids) {
      const userRes = await db.query('SELECT name FROM users WHERE id = $1', [b.user_id]);
      b.user_name = userRes.rows.length > 0 ? userRes.rows[0].name : null;
    }

    const bidCount = await db.query(
      'SELECT COUNT(*) FROM bids WHERE auction_id = $1',
      [id]
    );

    auction.images = imagesResult.rows;
    auction.bids = bids;
    auction.total_bids = parseInt(bidCount.rows[0].count);
    auction.min_increment = parseFloat(process.env.MIN_BID_INCREMENT || '500');

    res.json(auction);
  } catch (err) {
    console.error('Get auction detail error:', err);
    res.status(500).json({ error: 'Failed to fetch auction' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const result = auctionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: formatZodError(result.error) });
  }

  const {
    title, year, make, model, mileage, condition,
    description, starting_bid, start_time, end_time, images
  } = result.data;

  try {
    const now = new Date();
    const initialStatus = new Date(start_time) <= now ? 'active' : 'upcoming';

    const dbResult = await db.query(
      `INSERT INTO auctions 
        (title, year, make, model, mileage, condition, description, starting_bid, status, start_time, end_time, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [title, year, make, model, mileage, condition, description, starting_bid, initialStatus, start_time, end_time, req.user.id]
    );

    const auction = dbResult.rows[0];

    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await db.query(
          'INSERT INTO auction_images (auction_id, url, display_order) VALUES ($1, $2, $3)',
          [auction.id, images[i], i]
        );
      }
    }

    res.status(201).json(auction);
  } catch (err) {
    console.error('Create auction error:', err);
    res.status(500).json({ error: 'Failed to create auction' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const result = updateAuctionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: formatZodError(result.error) });
  }

  const {
    title, year, make, model, mileage, condition,
    description, starting_bid, start_time, end_time, images
  } = result.data;

  try {
    const check = await db.query('SELECT status FROM auctions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    if (check.rows[0].status !== 'upcoming') {
      return res.status(400).json({ error: 'Can only edit upcoming auctions' });
    }

    const dbResult = await db.query(
      `UPDATE auctions 
       SET title=$1, year=$2, make=$3, model=$4, mileage=$5, condition=$6,
           description=$7, starting_bid=$8, start_time=$9, end_time=$10
       WHERE id=$11
       RETURNING *`,
      [title, year, make, model, mileage, condition, description, starting_bid, start_time, end_time, id]
    );

    if (images !== undefined) {
      await db.query('DELETE FROM auction_images WHERE auction_id = $1', [id]);
      for (let i = 0; i < images.length; i++) {
        await db.query(
          'INSERT INTO auction_images (auction_id, url, display_order) VALUES ($1, $2, $3)',
          [id, images[i], i]
        );
      }
    }

    res.json(dbResult.rows[0]);
  } catch (err) {
    console.error('Update auction error:', err);
    res.status(500).json({ error: 'Failed to update auction' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const check = await db.query('SELECT id FROM auctions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    await db.query('DELETE FROM bids WHERE auction_id = $1', [id]);
    await db.query('DELETE FROM auction_images WHERE auction_id = $1', [id]);
    await db.query('DELETE FROM auctions WHERE id = $1', [id]);
    
    console.log(`[AUCTION] id=${id} permanently deleted by admin`);
    res.json({ message: 'Auction deleted' });
  } catch (err) {
    console.error('Delete auction error:', err);
    res.status(500).json({ error: 'Failed to delete auction' });
  }
});

router.post('/:id/close', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const check = await db.query('SELECT status FROM auctions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    const currentStatus = check.rows[0].status;
    if (currentStatus !== 'active' && currentStatus !== 'upcoming') {
      return res.status(400).json({ error: 'Only active or upcoming auctions can be closed' });
    }

    const topBid = await db.query(
      'SELECT user_id FROM bids WHERE auction_id = $1 ORDER BY amount DESC LIMIT 1',
      [id]
    );

    const winnerId = topBid.rows.length > 0 ? topBid.rows[0].user_id : null;

    const dbResult = await db.query(
      'UPDATE auctions SET status=$1, winner_id=$2 WHERE id=$3 RETURNING *',
      ['ended', winnerId, id]
    );

    console.log(`[AUCTION] id=${id} manually closed by admin, winner_id=${winnerId}`);
    res.json(dbResult.rows[0]);
  } catch (err) {
    console.error('Close auction error:', err);
    res.status(500).json({ error: 'Failed to close auction' });
  }
});

module.exports = router;
