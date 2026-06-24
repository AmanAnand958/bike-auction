import { useState, useEffect, useRef } from 'react';
import AuctionCard from '../components/AuctionCard';
import SkeletonCard from '../components/SkeletonCard';
import { getAuctions } from '../api';

const STATUS_TABS = ['all', 'active', 'upcoming', 'ended'];

function Home() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);

  async function fetchAuctions() {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (search.trim()) params.search = search.trim();

      const data = await getAuctions(params);
      setAuctions(data.auctions || []);
    } catch {
      setError('Failed to load auctions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAuctions();
  }, [activeTab]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAuctions();
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const activeCount = auctions.filter(a => a.status === 'active').length;

  return (
    <div>
      <div className="hero-section">
        <div className="hero-badge">
          <span className="live-dot" />
          Live Auctions Platform
        </div>

        <h1 className="hero-title">
          Bid on Premium<br />
          <span className="gradient-text">Student Bikes</span>
        </h1>

        <p className="hero-subtitle">
          Discover, bid, and win verified pre-owned bikes from student sellers.
          Real-time bidding with instant updates — no middlemen.
        </p>

        {!loading && auctions.length > 0 && (
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">{auctions.length}</div>
              <div className="hero-stat-label">Listings</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">{activeCount}</div>
              <div className="hero-stat-label">Active Now</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">⚡</div>
              <div className="hero-stat-label">Live Bids</div>
            </div>
          </div>
        )}
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        <div className="filters-section">
          <div className="filters">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by make, model, year..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-tabs">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab}
                  className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'all' && '🔥 '}
                  {tab === 'active' && '✅ '}
                  {tab === 'upcoming' && '⏳ '}
                  {tab === 'ended' && '🏁 '}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="auction-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {!loading && !error && auctions.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">🏍️</span>
            <h3>No auctions found</h3>
            <p>{search ? `No results for "${search}". Try a different search term.` : 'No auctions in this category yet.'}</p>
          </div>
        )}

        {!loading && auctions.length > 0 && (
          <div className="auction-grid">
            {auctions.map((auction, i) => (
              <AuctionCard key={auction.id} auction={auction} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
