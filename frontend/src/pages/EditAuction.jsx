import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuction, updateAuction, uploadImage } from '../api';

function toLocalDatetimeInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function EditAuction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageUrls, setImageUrls] = useState(['', '', '', '', '']);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  const [form, setForm] = useState({
    title: '', year: '', make: '', model: '', mileage: '',
    condition: 'good', description: '', starting_bid: '',
    start_time: '', end_time: '',
  });

  useEffect(() => {
    async function loadAuction() {
      try {
        const data = await getAuction(id);

        if (data.status !== 'upcoming') {
          setError('Only upcoming auctions can be edited.');
          setFetching(false);
          return;
        }

        setForm({
          title: data.title,
          year: data.year,
          make: data.make,
          model: data.model,
          mileage: data.mileage,
          condition: data.condition,
          description: data.description || '',
          starting_bid: data.starting_bid,
          start_time: toLocalDatetimeInput(data.start_time),
          end_time: toLocalDatetimeInput(data.end_time),
        });

        const urls = (data.images || []).map(img => img.url);
        while (urls.length < 5) urls.push('');
        setImageUrls(urls);
      } catch {
        setError('Failed to load auction');
      } finally {
        setFetching(false);
      }
    }
    loadAuction();
  }, [id]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleImageUrlChange(index, value) {
    const updated = [...imageUrls];
    updated[index] = value;
    setImageUrls(updated);
  }

  async function handleFileUpload(index, file) {
    if (!file) return;
    setUploadingIndex(index);
    setError('');
    try {
      const result = await uploadImage(file);
      const updated = [...imageUrls];
      updated[index] = result.url;
      setImageUrls(updated);
    } catch (err) {
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingIndex(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setError('End time must be after start time');
      return;
    }
    if (uploadingIndex !== null) {
      setError('Please wait for the image upload to finish');
      return;
    }

    setLoading(true);
    try {
      const images = imageUrls.filter(url => url.trim() !== '');
      await updateAuction(id, { ...form, images });
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Loading auction...
      </div>
    );
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/admin')}>
        ← Back to Dashboard
      </button>

      <div className="page-header">
        <h1>✏️ Edit Auction</h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {!error && (
        <form onSubmit={handleSubmit} style={{ maxWidth: '720px' }}>
          {/* Section 1: Bike Info */}
          <div className="form-card">
            <div className="form-card-title">🏍️ Bike Information</div>

            <div className="form-group">
              <label>Auction Title</label>
              <input type="text" name="title" className="form-control" value={form.title} onChange={handleChange} maxLength={200} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Year</label>
                <input type="number" name="year" className="form-control" value={form.year} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Make</label>
                <input type="text" name="make" className="form-control" value={form.make} onChange={handleChange} maxLength={100} required />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input type="text" name="model" className="form-control" value={form.model} onChange={handleChange} maxLength={100} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Mileage (km)</label>
                <input type="number" name="mileage" className="form-control" value={form.mileage} onChange={handleChange} min="0" required />
              </div>
              <div className="form-group">
                <label>Condition</label>
                <select name="condition" className="form-control" value={form.condition} onChange={handleChange}>
                  <option value="excellent">✨ Excellent</option>
                  <option value="good">👍 Good</option>
                  <option value="fair">🔧 Fair</option>
                  <option value="poor">⚠️ Poor</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea name="description" className="form-control" value={form.description} onChange={handleChange} maxLength={5000} />
            </div>
          </div>

          {/* Section 2: Auction Settings */}
          <div className="form-card">
            <div className="form-card-title">💰 Auction Settings</div>

            <div className="form-group">
              <label>Starting Bid (₹)</label>
              <input type="number" name="starting_bid" className="form-control" value={form.starting_bid} onChange={handleChange} min="1" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date &amp; Time</label>
                <input type="datetime-local" name="start_time" className="form-control" value={form.start_time} onChange={handleChange} required />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  💡 Click on the hours, minutes, or AM/PM in the input box to type/edit the time directly using your keyboard.
                </p>
              </div>
              <div className="form-group">
                <label>End Date &amp; Time</label>
                <input type="datetime-local" name="end_time" className="form-control" value={form.end_time} onChange={handleChange} required />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  💡 Click on the hours, minutes, or AM/PM in the input box to type/edit the time directly using your keyboard.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Images */}
          <div className="form-card">
            <div className="form-card-title">🖼️ Images (up to 5)</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              First image is the cover photo.
            </p>

            {imageUrls.map((url, i) => (
              <div key={i} className="image-input-row">
                <input
                  type="url"
                  className="form-control"
                  value={url}
                  onChange={(e) => handleImageUrlChange(i, e.target.value)}
                  placeholder={`Image ${i + 1} URL ${i === 0 ? '(Cover Photo)' : '(optional)'}`}
                />
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {uploadingIndex === i ? '⏳ Uploading...' : '📁 Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(i, e.target.files[0])}
                    disabled={uploadingIndex !== null}
                  />
                </label>
                {url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--card-border)' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', minWidth: 'auto', padding: '0 8px' }}
                      onClick={() => handleImageUrlChange(i, '')}
                      title="Remove Image"
                    >
                      ❌
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading || uploadingIndex !== null}>
              {loading ? '⏳ Saving...' : '✅ Save Changes'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin')}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default EditAuction;
