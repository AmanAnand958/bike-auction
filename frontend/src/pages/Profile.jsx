import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMe } from '../api';

function formatINR(amount) {
  if (!amount) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getMe();
        setProfile(data);
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Loading profile...
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

  const bids = profile?.bids || [];
  const winningBids = bids.filter(b => b.is_winning && b.auction_status !== 'ended');
  const wonAuctions = bids.filter(b => b.status === 'ended' && b.is_winning);

  // Group bids by auction_id and keep the highest bid amount for each auction
  const compactedBids = Object.values(
    bids.reduce((acc, bid) => {
      const existing = acc[bid.auction_id];
      if (!existing || Number(bid.amount) > Number(existing.amount)) {
        acc[bid.auction_id] = bid;
      }
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="page">
      {/* Profile header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {getInitials(profile.name)}
        </div>
        <div className="profile-info">
          <h2>{profile.name}</h2>
          <p>{profile.email}</p>
          <p style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            Member since {new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--primary)' }}>{bids.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Bids</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--success)' }}>{winningBids.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leading</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent2)' }}>{wonAuctions.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Won 🏆</div>
          </div>
        </div>
      </div>

      {/* My bids */}
      <div className="page-header">
        <h1>My Bids</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{compactedBids.length} auction{compactedBids.length !== 1 ? 's' : ''}</span>
      </div>

      {compactedBids.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">🏍️</span>
          <h3>No bids placed yet</h3>
          <p>Start bidding on auctions to see your history here.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '20px' }}>
            Browse Auctions →
          </Link>
        </div>
      )}

      {compactedBids.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>🏍️ Auction</th>
                <th>Your Bid</th>
                <th>Current Highest</th>
                <th>Status</th>
                <th>Auction Ends</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {compactedBids.map(bid => (
                <tr key={bid.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{bid.title}</div>
                  </td>
                  <td style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
                    {formatINR(bid.amount)}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>
                      {formatINR(bid.current_bid)}
                    </span>
                    {bid.is_winning && bid.auction_status !== 'ended' && (
                      <span style={{ display: 'inline-block', marginLeft: '8px' }}>
                        <span className="badge badge-active">✓ Leading</span>
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${bid.status}`}>{bid.status}</span>
                    {bid.status === 'ended' && bid.is_winning && (
                      <span style={{ marginLeft: '6px', fontSize: '0.85rem' }}>🏆</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(bid.end_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td>
                    <Link to={`/auctions/${bid.auction_id}`} className="btn btn-ghost btn-sm">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Profile;
