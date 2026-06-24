import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuctions, closeAuction, deleteAuction } from '../api';

function formatINR(amount) {
  if (!amount) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function AdminDashboard() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchAll() {
    setLoading(true);
    try {
      const data = await getAuctions({ limit: 100 });
      setAuctions(data.auctions || []);
    } catch {
      setError('Failed to load auctions');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, []);

  async function handleClose(id) {
    if (!confirm('Are you sure you want to close this auction?')) return;
    try {
      await closeAuction(id);
      fetchAll();
    } catch (err) {
      alert('Failed to close auction: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to permanently delete this auction? All associated images and bids will be permanently deleted.')) return;
    try {
      await deleteAuction(id);
      fetchAll();
    } catch (err) {
      alert('Failed to delete auction: ' + err.message);
    }
  }

  const total = auctions.length;
  const activeNow = auctions.filter(a => a.status === 'active').length;
  const upcoming = auctions.filter(a => a.status === 'upcoming').length;

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🎛️ Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Manage all bike auctions
          </p>
        </div>
        <Link to="/admin/auctions/new" className="btn btn-primary">
          + Create Auction
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon">📋</span>
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total Auctions</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div className="stat-number">{activeNow}</div>
          <div className="stat-label">Active Now</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏳</span>
          <div className="stat-number">{upcoming}</div>
          <div className="stat-label">Upcoming</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>🏍️ Bike</th>
              <th>Status</th>
              <th>Current Bid</th>
              <th>End Time</th>
              <th>Bids</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {auctions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '40px' }}>
                  No auctions yet.{' '}
                  <Link to="/admin/auctions/new">Create one →</Link>
                </td>
              </tr>
            )}
            {auctions.map(auction => (
              <tr key={auction.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{auction.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-faint)', marginTop: '2px' }}>
                    ID #{auction.id}
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${auction.status}`}>{auction.status}</span>
                </td>
                <td style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: 'var(--primary)' }}>
                  {formatINR(auction.current_bid || auction.starting_bid)}
                </td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {new Date(auction.end_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td style={{ fontWeight: 600 }}>{auction.bid_count}</td>
                <td>
                  <div className="actions">
                    <Link to={`/auctions/${auction.id}`} className="btn btn-ghost btn-sm">View</Link>
                    {auction.status === 'upcoming' && (
                      <Link to={`/admin/auctions/${auction.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                    )}
                    {(auction.status === 'active' || auction.status === 'upcoming') && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleClose(auction.id)}
                      >
                        Close
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleDelete(auction.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;
