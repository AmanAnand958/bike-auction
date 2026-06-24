import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuction, uploadImage } from '../api';

function CreateAuction() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    year: new Date().getFullYear(),
    make: '',
    model: '',
    mileage: '',
    condition: 'good',
    description: '',
    starting_bid: '',
    start_time: '',
    end_time: '',
  });

  const [imageUrls, setImageUrls] = useState(['', '', '', '', '']);
  const [uploadingIndex, setUploadingIndex] = useState(null);

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
    if (parseFloat(form.starting_bid) <= 0) {
      setError('Starting bid must be greater than 0');
      return;
    }
    if (uploadingIndex !== null) {
      setError('Please wait for the image upload to finish');
      return;
    }

    setLoading(true);
    try {
      const images = imageUrls.filter(url => url.trim() !== '');
      await createAuction({ ...form, images });
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/admin')}>
        ← Back to Dashboard
      </button>

      <div className="page-header">
        <h1>➕ Create New Auction</h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '720px' }}>
        {/* Section 1: Bike Info */}
        <div className="form-card">
          <div className="form-card-title">🏍️ Bike Information</div>

          <div className="form-group">
            <label>Auction Title</label>
            <input
              type="text"
              name="title"
              className="form-control"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. 2019 Royal Enfield Classic 350"
              maxLength={200}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Year</label>
              <input type="number" name="year" className="form-control" value={form.year} onChange={handleChange} min="1990" max={new Date().getFullYear() + 1} required />
            </div>
            <div className="form-group">
              <label>Make</label>
              <input type="text" name="make" className="form-control" value={form.make} onChange={handleChange} placeholder="Royal Enfield" maxLength={100} required />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input type="text" name="model" className="form-control" value={form.model} onChange={handleChange} placeholder="Classic 350" maxLength={100} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Mileage (km)</label>
              <input type="number" name="mileage" className="form-control" value={form.mileage} onChange={handleChange} placeholder="12000" min="0" required />
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
            <textarea
              name="description"
              className="form-control"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the bike's condition, history, any modifications..."
              maxLength={5000}
            />
          </div>
        </div>

        {/* Section 2: Auction Details */}
        <div className="form-card">
          <div className="form-card-title">💰 Auction Settings</div>

          <div className="form-group">
            <label>Starting Bid (₹)</label>
            <input type="number" name="starting_bid" className="form-control" value={form.starting_bid} onChange={handleChange} placeholder="50000" min="1" required />
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
            Paste image URLs or upload from your computer. The first image will be the cover photo.
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" className="btn btn-primary" disabled={loading || uploadingIndex !== null}>
            {loading ? '⏳ Creating...' : '✅ Create Auction'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateAuction;
