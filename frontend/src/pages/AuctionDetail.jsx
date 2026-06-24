import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getAuction, getBids, placeBid } from '../api';
import { useAuth } from '../App';
import CountdownTimer from '../components/CountdownTimer';

const BIKE_IMAGES = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80',
  'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&q=80',
];
const PLACEHOLDER = BIKE_IMAGES[0];
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const QUICK_INCREMENTS = [500, 1000, 5000];

function formatINR(amount) {
  if (!amount) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function AuctionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [bidUpdated, setBidUpdated] = useState(false);
  const [bids, setBids] = useState([]);

  const socketRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchAuction();
    fetchBids();
  }, [id]);

  useEffect(() => {
    if (!auction || auction.status !== 'active') return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_auction', id);
      clearInterval(pollingRef.current);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      pollingRef.current = setInterval(() => {
        fetchAuction();
        fetchBids();
      }, 5000);
    });

    socket.on('new_bid', () => {
      fetchAuction();
      fetchBids();
      setBidUpdated(true);
      setTimeout(() => setBidUpdated(false), 500);
    });

    pollingRef.current = setInterval(() => {
      if (!socketRef.current?.connected) {
        fetchAuction();
        fetchBids();
      }
    }, 5000);

    return () => {
      socket.emit('leave_auction', id);
      socket.disconnect();
      clearInterval(pollingRef.current);
    };
  }, [auction?.status, id]);

  async function fetchAuction() {
    try {
      const data = await getAuction(id);
      setAuction(data);
    } catch {
      setError('Auction not found');
    } finally {
      setLoading(false);
    }
  }

  async function fetchBids() {
    try {
      const data = await getBids(id);
      setBids(data.bids || []);
    } catch (err) {
      console.error('Failed to load bids:', err);
    }
  }

  async function handleBid(e) {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');

    const amount = parseFloat(bidAmount);
    const minBid = auction.current_bid
      ? parseFloat(auction.current_bid)
      : parseFloat(auction.starting_bid);
    const minIncrement = auction.min_increment || 500;
    const minValidBid = minBid + minIncrement;

    if (!amount || amount < minValidBid) {
      setBidError(`Bid must be at least ${formatINR(minValidBid)}`);
      return;
    }

    setBidding(true);
    try {
      await placeBid(id, amount);
      setBidSuccess(`Bid of ${formatINR(amount)} placed successfully!`);
      setBidAmount('');
      fetchAuction();
      fetchBids();
      
      setTimeout(() => {
        setBidSuccess('');
      }, 5000);
    } catch (err) {
      setBidError(err.message);
    } finally {
      setBidding(false);
    }
  }

  function setQuickBid(extraAmount) {
    const base = auction.current_bid
      ? parseFloat(auction.current_bid)
      : parseFloat(auction.starting_bid);
    const minIncrement = auction.min_increment || 500;
    const quickAmount = Math.max(base + extraAmount, base + minIncrement);
    setBidAmount(quickAmount.toString());
    setBidError('');
    setBidSuccess('');
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Loading auction details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      </div>
    );
  }

  if (!auction) return null;

  const images = auction.images || [];
  const topBid = bids[0];
  const displayBid = auction.current_bid || auction.starting_bid;
  const minIncrement = auction.min_increment || 500;
  const minNextBid = parseFloat(displayBid) + minIncrement;
  const isActive = auction.status === 'active';
  const canBid = user && isActive;
  const isAlreadyHighestBidder = topBid && user && topBid.user_name === user.name;
 
  const startPoint = {
    amount: parseFloat(auction.starting_bid),
    user_name: 'Starting Bid',
    created_at: auction.start_time
  };
  const trendData = [...bids].reverse();
  const points = [startPoint, ...trendData];

  const maxVal = Math.max(...points.map(p => parseFloat(p.amount)));
  const minVal = Math.min(...points.map(p => parseFloat(p.amount)));
  const range = maxVal - minVal;

  const paddingX = 20;
  const paddingY = 15;

  let pathD = '';
  let areaD = '';

  points.forEach((p, idx) => {
    const x = paddingX + (points.length > 1 ? (idx / (points.length - 1)) * 460 : 230);
    const y = 150 - paddingY - (range > 0 ? ((parseFloat(p.amount) - minVal) / range) * 120 : 60);
    if (idx === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }
  });

  if (points.length > 0) {
    const lastX = paddingX + (points.length > 1 ? 460 : 230);
    const firstX = paddingX;
    areaD = `${pathD} L ${lastX} ${150 - paddingY} L ${firstX} ${150 - paddingY} Z`;
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back to Auctions
      </button>

      <div className="auction-detail">
        <div>
          <div className="image-gallery">
            <div className="image-gallery-main">
              <img
                src={images[activeImage]?.url || PLACEHOLDER}
                alt={auction.title}
                onError={(e) => { e.target.src = PLACEHOLDER; }}
              />
            </div>
          </div>

          {images.length > 1 && (
            <div className="image-thumbs">
              {images.map((img, i) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={`Photo ${i + 1}`}
                  className={activeImage === i ? 'active' : ''}
                  onClick={() => setActiveImage(i)}
                  onError={(e) => { e.target.src = PLACEHOLDER; }}
                />
              ))}
            </div>
          )}

          <div className="bike-info">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h1>{auction.title}</h1>
              <span className={`badge badge-${auction.status}`}>{auction.status}</span>
            </div>

            <div className="bike-specs">
              <div className="spec-item">
                <div className="spec-label">Year</div>
                <div className="spec-value">{auction.year || '—'}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Make</div>
                <div className="spec-value">{auction.make || '—'}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Model</div>
                <div className="spec-value">{auction.model || '—'}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Mileage</div>
                <div className="spec-value">{auction.mileage?.toLocaleString() ?? '—'} km</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Condition</div>
                <div className="spec-value" style={{ textTransform: 'capitalize' }}>{auction.condition || '—'}</div>
              </div>
            </div>

            {auction.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.7', marginTop: '8px' }}>
                {auction.description}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="bid-panel">
            <div className="bid-panel-header">
              {auction.current_bid ? '🔥 Current Highest Bid' : '💰 Starting Bid'}
            </div>

            <div className={`current-bid-amount ${bidUpdated ? 'bid-updated' : ''}`}>
              {formatINR(displayBid)}
            </div>

            {topBid && (
              <div className="bid-by">
                by <strong style={{ color: 'var(--text)' }}>{topBid.user_name}</strong>
                {' · '}{timeAgo(topBid.created_at)}
                {isAlreadyHighestBidder && (
                  <span className="winning-badge">✓ You're Winning!</span>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <CountdownTimer
                endTime={auction.end_time}
                startTime={auction.start_time}
                status={auction.status}
                large
              />
            </div>

            <div className="bid-divider" />

            {canBid && !isAlreadyHighestBidder && (
              <form onSubmit={handleBid}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>
                  Minimum next bid: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatINR(minNextBid)}</span>
                  <span style={{ marginLeft: '6px', color: 'var(--text-faint)' }}>(+{formatINR(minIncrement)} increment)</span>
                </div>

                <div className="quick-bid-buttons">
                  {QUICK_INCREMENTS.map(inc => (
                    <button
                      key={inc}
                      type="button"
                      className="quick-bid-btn"
                      onClick={() => setQuickBid(inc)}
                    >
                      +{formatINR(inc)}
                    </button>
                  ))}
                </div>

                <div className="bid-form">
                  <input
                    type="number"
                    placeholder={`Min ₹${minNextBid.toLocaleString('en-IN')}`}
                    value={bidAmount}
                    onChange={(e) => {
                      setBidAmount(e.target.value);
                      setBidError('');
                      setBidSuccess('');
                    }}
                    min={minNextBid}
                    step="100"
                  />
                  <button type="submit" className="btn btn-primary" disabled={bidding}>
                    {bidding ? '⏳' : '🔥 Bid'}
                  </button>
                </div>
              </form>
            )}

            {canBid && isAlreadyHighestBidder && (
              <div className="alert alert-success" style={{ marginTop: '8px' }}>
                <span className="alert-icon">🏆</span>
                You're the current highest bidder! Place a higher bid to secure your lead.
              </div>
            )}

            {!user && isActive && (
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '10px' }}>
                  Sign in to place a bid
                </p>
                <a href="/login" className="btn btn-primary btn-sm">Sign In to Bid</a>
              </div>
            )}

            {bidError && (
              <div className="alert alert-error" style={{ marginTop: '12px' }}>
                <span className="alert-icon">⚠️</span>
                {bidError}
              </div>
            )}

            {bidSuccess && (
              <div className="alert alert-success" style={{ marginTop: '12px' }}>
                <span className="alert-icon">🎉</span>
                {bidSuccess}
              </div>
            )}

            {auction.status === 'ended' && auction.winner_name && (
              <div className="winner-banner">
                <div className="trophy">🏆</div>
                <div>Winner: <strong>{auction.winner_name}</strong></div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Winning bid: {formatINR(auction.current_bid)}
                </div>
              </div>
            )}

            {points.length > 1 && (
              <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  📈 Bidding Trend
                </div>
                <div style={{ background: 'var(--bg3)', borderRadius: '12px', padding: '16px', border: '1px solid var(--card-border)' }}>
                  <svg viewBox="0 0 500 150" width="100%" height="100%" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="orange-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    
                    <line x1="20" y1="15" x2="480" y2="15" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="20" y1="75" x2="480" y2="75" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="20" y1="135" x2="480" y2="135" stroke="var(--border)" strokeWidth="0.5" />
                    
                    <path d={areaD} fill="url(#orange-gradient)" />
                    <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {points.map((p, idx) => {
                      const x = paddingX + (points.length > 1 ? (idx / (points.length - 1)) * 460 : 230);
                      const y = 150 - paddingY - (range > 0 ? ((parseFloat(p.amount) - minVal) / range) * 120 : 60);
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="var(--bg2)"
                          stroke="var(--primary)"
                          strokeWidth="2.5"
                          style={{ transition: 'r 0.15s ease', cursor: 'pointer' }}
                          onMouseEnter={(e) => { e.target.setAttribute('r', '6'); }}
                          onMouseLeave={(e) => { e.target.setAttribute('r', '4'); }}
                        >
                          <title>{`${p.user_name}: ${formatINR(p.amount)}`}</title>
                        </circle>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}

            <div className="bid-divider" />

            <div className="bid-history">
              <div className="bid-history-header">
                <span className="bid-history-title">Bid History</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>{bids.length} bid{bids.length !== 1 ? 's' : ''}</span>
              </div>

              {bids.length === 0 && (
                <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                  No bids yet. Be the first! 🎯
                </p>
              )}

              {bids.map((bid, i) => (
                <div key={bid.id} className="bid-item">
                  <div className="bid-item-user">
                    <div className="bid-avatar">{getInitials(bid.user_name)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{bid.user_name}</div>
                      {i === 0 && (
                        <span className="bid-top-badge">★ Highest</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="bid-amount">{formatINR(bid.amount)}</div>
                    <div className="bid-time">{timeAgo(bid.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>

            {isActive && (
              <div className="live-status">
                {isConnected ? (
                  <>
                    <span className="live-dot-connected" />
                    Live updates active
                  </>
                ) : (
                  <>
                    <span style={{ width: 7, height: 7, background: 'var(--text-faint)', borderRadius: '50%', display: 'inline-block' }} />
                    Refreshing every 5s
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuctionDetail;
