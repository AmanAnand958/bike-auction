import { Link } from 'react-router-dom';
import CountdownTimer from './CountdownTimer';

function formatINR(amount) {
  if (!amount) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

const BIKE_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&q=80',
  'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=600&q=80',
  'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=600&q=80',
];

function AuctionCard({ auction, index = 0 }) {
  const {
    id, title, status, cover_image,
    starting_bid, current_bid, start_time, end_time, bid_count
  } = auction;

  const displayBid = current_bid || starting_bid;
  const bidLabel = current_bid ? 'Current Bid' : 'Starting Bid';
  const fallback = BIKE_PLACEHOLDERS[index % BIKE_PLACEHOLDERS.length];

  return (
    <div
      className="auction-card"
      style={{ animationDelay: `${(index % 6) * 0.07}s` }}
    >
      <div className="auction-card-image-wrap">
        <img
          src={cover_image || fallback}
          alt={title}
          onError={(e) => { e.target.src = fallback; }}
        />
        <div className="auction-card-image-overlay" />
        <div className="auction-card-status">
          <span className={`badge badge-${status}`}>{status}</span>
        </div>
      </div>

      <div className="auction-card-body">
        <h3>{title}</h3>

        <div className="auction-card-bid">
          {formatINR(displayBid)}
          <span>{bidLabel}</span>
        </div>

        <div className="auction-card-countdown">
          <CountdownTimer endTime={end_time} startTime={start_time} status={status} />
          <span className="sep">·</span>
          <span>{bid_count} bid{bid_count !== '1' ? 's' : ''}</span>
        </div>

        <Link to={`/auctions/${id}`} className="btn btn-primary btn-sm btn-block">
          View Auction →
        </Link>
      </div>
    </div>
  );
}

export default AuctionCard;
