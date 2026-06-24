const cron = require('node-cron');
const db = require('./db');

function startCronJobs() {
  cron.schedule('* * * * *', async () => {
    try {
      const expired = await db.query(
        `SELECT id, title FROM auctions 
         WHERE status = 'active' AND end_time <= NOW()`
      );

      for (const auction of expired.rows) {
        const topBid = await db.query(
          `SELECT user_id, amount
           FROM bids 
           WHERE auction_id = $1 
           ORDER BY amount DESC LIMIT 1`,
          [auction.id]
        );

        const winner = topBid.rows[0] || null;
        const winnerId = winner ? winner.user_id : null;

        await db.query(
          'UPDATE auctions SET status=$1, winner_id=$2 WHERE id=$3',
          ['ended', winnerId, auction.id]
        );

        console.log(`[AUCTION] id=${auction.id} status changed to ENDED, winner_id=${winnerId}`);
      }

      const toActivate = await db.query(
        `SELECT id FROM auctions 
         WHERE status = 'upcoming' AND start_time <= NOW()`
      );

      for (const auction of toActivate.rows) {
        await db.query(
          'UPDATE auctions SET status=$1 WHERE id=$2',
          ['active', auction.id]
        );
        console.log(`[AUCTION] id=${auction.id} status changed to ACTIVE`);
      }
    } catch (err) {
      console.error('[CRON] Error in auction status job:', err);
    }
  });

  console.log('Cron jobs started - checking auction status every minute');
}

module.exports = { startCronJobs };
